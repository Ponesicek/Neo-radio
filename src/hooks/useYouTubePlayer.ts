import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface YouTubePlayerOptions {
  videoId: string | null;
  isPlaying: boolean;
  canNext: boolean;
  onNext: () => void;
  onPlayPause: () => void;
}

function buildEmbedUrl(videoId: string) {
  const params = new URLSearchParams({
    autoplay: "1",
    controls: "0",
    enablejsapi: "1",
    rel: "0",
    playsinline: "1",
    modestbranding: "1",
  });
  if (window.location.origin && window.location.origin !== "null") {
    params.set("origin", window.location.origin);
  }
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function parseMessageData(data: unknown) {
  if (!data) return null;
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
}

function getPlayerState(data: unknown) {
  const parsed = parseMessageData(data) as
    | { event?: string; info?: unknown }
    | null;

  if (!parsed) return null;
  if (parsed.event === "onStateChange" && typeof parsed.info === "number") {
    return parsed.info;
  }
  if (
    parsed.event === "infoDelivery" &&
    typeof parsed.info === "object" &&
    parsed.info !== null &&
    "playerState" in parsed.info &&
    typeof (parsed.info as { playerState?: number }).playerState === "number"
  ) {
    return (parsed.info as { playerState?: number }).playerState ?? null;
  }
  return null;
}

function getInfoDelivery(data: unknown) {
  const parsed = parseMessageData(data) as
    | { event?: string; info?: unknown }
    | null;

  if (!parsed) return null;
  if (
    parsed.event !== "infoDelivery" ||
    typeof parsed.info !== "object" ||
    parsed.info === null
  ) {
    return null;
  }
  return parsed.info as Record<string, unknown>;
}

export function useYouTubePlayer({
  videoId,
  isPlaying,
  canNext,
  onNext,
  onPlayPause,
}: YouTubePlayerOptions) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const handledEndRef = useRef<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  const embedSrc = useMemo(() => {
    if (!videoId) return "";
    return buildEmbedUrl(videoId);
  }, [videoId]);

  const postCommand = useCallback(
    (func: string, args: unknown[] = []) => {
      if (!playerReady || !iframeRef.current?.contentWindow) return;
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*",
      );
    },
    [playerReady],
  );

  const sendListening = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: "listening" }),
      "*",
    );
  }, []);

  const handleIframeLoad = useCallback(() => {
    setPlayerReady(true);
    sendListening();
  }, [sendListening]);

  useEffect(() => {
    if (!videoId) return;
    if (isPlaying) {
      postCommand("playVideo");
    } else {
      postCommand("pauseVideo");
    }
  }, [isPlaying, videoId, playerReady, postCommand]);

  useEffect(() => {
    if (!videoId) return;
    postCommand("setVolume", [volume]);
    if (volume > 0) {
      postCommand("unMute");
    } else {
      postCommand("mute");
    }
  }, [volume, videoId, playerReady, postCommand]);

  useEffect(() => {
    setPlayerReady(false);
    setCurrentTime(0);
    setDuration(0);
    setSeekValue(0);
    setIsSeeking(false);
  }, [videoId]);

  useEffect(() => {
    handledEndRef.current = null;
  }, [videoId]);

  useEffect(() => {
    if (!playerReady) return;
    sendListening();
  }, [playerReady, videoId, sendListening]);

  useEffect(() => {
    if (!playerReady || !videoId) return;
    const intervalId = window.setInterval(() => {
      postCommand("getCurrentTime");
      postCommand("getDuration");
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [playerReady, videoId, postCommand]);

  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(currentTime);
    }
  }, [currentTime, isSeeking]);

  useEffect(() => {
    if (!videoId) return;
    const handleMessage = (event: MessageEvent) => {
      const isPlayerMessage =
        !!iframeRef.current?.contentWindow &&
        event.source === iframeRef.current.contentWindow;
      if (!isPlayerMessage) return;

      const info = getInfoDelivery(event.data);
      if (info) {
        if (typeof info.duration === "number" && info.duration > 0) {
          setDuration(info.duration);
        }
        if (typeof info.currentTime === "number" && !isSeeking) {
          setCurrentTime(info.currentTime);
        }
      }

      const state = getPlayerState(event.data);
      if (state !== 0) return;

      if (handledEndRef.current === videoId) return;
      handledEndRef.current = videoId;

      if (canNext) {
        onNext();
        return;
      }

      if (isPlaying) {
        onPlayPause();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [videoId, canNext, onNext, onPlayPause, isPlaying, isSeeking]);

  const onSeekValueChange = useCallback(
    (value: number[]) => {
      if (duration <= 0) return;
      setIsSeeking(true);
      setSeekValue(value[0] ?? 0);
    },
    [duration],
  );

  const onSeekCommit = useCallback(
    (value: number[]) => {
      if (duration <= 0) return;
      const nextValue = value[0] ?? 0;
      setIsSeeking(false);
      setSeekValue(nextValue);
      setCurrentTime(nextValue);
      postCommand("seekTo", [nextValue, true]);
    },
    [duration, postCommand],
  );

  const hasDuration = duration > 0;
  const displayTime = isSeeking ? seekValue : currentTime;
  const timelineValue = hasDuration ? Math.min(displayTime, duration) : 0;

  return {
    iframeRef,
    embedSrc,
    volume,
    setVolume,
    duration,
    hasDuration,
    displayTime,
    timelineValue,
    onSeekValueChange,
    onSeekCommit,
    onIframeLoad: handleIframeLoad,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import type { SongRowProps } from "./Playlist";

type PlaybackSong = Extract<SongRowProps, { isSong: true }>;

interface PlaybackBarProps {
  song: PlaybackSong | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  canNext: boolean;
  canPrev: boolean;
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

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function PlaybackBar({
  song,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  canNext,
  canPrev,
}: PlaybackBarProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const handledEndRef = useRef<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  const embedSrc = useMemo(() => {
    if (!song) return "";
    return buildEmbedUrl(song.videoId);
  }, [song?.videoId]);

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

  const sendListening = () => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: "listening" }),
      "*",
    );
  };

  useEffect(() => {
    if (!song) return;
    if (isPlaying) {
      postCommand("playVideo");
    } else {
      postCommand("pauseVideo");
    }
  }, [isPlaying, song?.videoId, playerReady, postCommand]);

  useEffect(() => {
    if (!song) return;
    postCommand("setVolume", [volume]);
    if (volume > 0) {
      postCommand("unMute");
    } else {
      postCommand("mute");
    }
  }, [volume, song?.videoId, playerReady, postCommand]);

  useEffect(() => {
    setPlayerReady(false);
    setCurrentTime(0);
    setDuration(0);
    setSeekValue(0);
    setIsSeeking(false);
  }, [song?.videoId]);

  useEffect(() => {
    handledEndRef.current = null;
  }, [song?.videoId]);

  useEffect(() => {
    if (!playerReady) return;
    sendListening();
  }, [playerReady, song?.videoId]);

  useEffect(() => {
    if (!playerReady || !song) return;
    const intervalId = window.setInterval(() => {
      postCommand("getCurrentTime");
      postCommand("getDuration");
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [playerReady, song?.videoId, postCommand]);

  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(currentTime);
    }
  }, [currentTime, isSeeking]);

  useEffect(() => {
    if (!song) return;
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

      if (handledEndRef.current === song.videoId) return;
      handledEndRef.current = song.videoId;

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
  }, [song, canNext, onNext, onPlayPause, isPlaying, isSeeking]);

  const hasDuration = duration > 0;
  const displayTime = isSeeking ? seekValue : currentTime;
  const timelineValue = hasDuration
    ? Math.min(displayTime, duration)
    : 0;

  return (
    <div className="w-full border-t bg-card px-4 py-3 flex flex-row items-between justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 w-fit">
          {song ? (
            <>
              <img
                src={song.thumbnailUrl}
                alt={`${song.name} cover`}
                className="h-10 w-16 object-cover rounded-sm"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{song.name}</p>
                <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No track loaded</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            disabled={!canPrev}
            aria-label="Previous track"
          >
            <SkipBack />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onPlayPause}
            disabled={!song}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause /> : <Play />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            disabled={!canNext}
            aria-label="Next track"
          >
            <SkipForward />
          </Button>
        </div>
      </div>
      <div className="flex flex-1 px-4 items-center justify-center">
        <div className="flex w-full gap-2">
          <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
            {formatTime(timelineValue)}
          </span>
          <Slider
            value={[timelineValue]}
            onValueChange={(value) => {
              if (!hasDuration) return;
              setIsSeeking(true);
              setSeekValue(value[0] ?? 0);
            }}
            onValueCommit={(value) => {
              if (!hasDuration) return;
              const nextValue = value[0] ?? 0;
              setIsSeeking(false);
              setSeekValue(nextValue);
              setCurrentTime(nextValue);
              postCommand("seekTo", [nextValue, true]);
            }}
            min={0}
            max={hasDuration ? duration : 1}
            step={1}
            disabled={!song || !hasDuration}
            aria-label="Song timeline"
          />
          <span className="text-xs tabular-nums text-muted-foreground w-12">
            {hasDuration ? formatTime(duration) : "--:--"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full max-w-xs">
        <Volume2 className="text-muted-foreground" size={16} />
        <Slider
          value={[volume]}
          onValueChange={(value) => setVolume(value[0] ?? volume)}
          min={0}
          max={100}
        />
      </div>
      {song ? (
        <iframe
          ref={iframeRef}
          title="Playback"
          src={embedSrc}
          allow="autoplay; encrypted-media"
          onLoad={() => {
            setPlayerReady(true);
            sendListening();
          }}
          className="absolute h-0 w-0 opacity-0 pointer-events-none"
        />
      ) : null}
    </div>
  );
}

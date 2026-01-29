import { useEffect, useMemo, useRef, useState } from "react";
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

  const embedSrc = useMemo(() => {
    if (!song) return "";
    return buildEmbedUrl(song.videoId);
  }, [song?.videoId]);

  const postCommand = (func: string, args: unknown[] = []) => {
    if (!playerReady || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
    );
  };

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
  }, [isPlaying, song?.videoId, playerReady]);

  useEffect(() => {
    if (!song) return;
    postCommand("setVolume", [volume]);
    if (volume > 0) {
      postCommand("unMute");
    } else {
      postCommand("mute");
    }
  }, [volume, song?.videoId, playerReady]);

  useEffect(() => {
    setPlayerReady(false);
  }, [song?.videoId]);

  useEffect(() => {
    handledEndRef.current = null;
  }, [song?.videoId]);

  useEffect(() => {
    if (!playerReady) return;
    sendListening();
  }, [playerReady, song?.videoId]);

  useEffect(() => {
    if (!song) return;
    const handleMessage = (event: MessageEvent) => {
      const parsedEvent = parseMessageData(event.data);
      const isPlayerMessage =
        !!iframeRef.current?.contentWindow &&
        event.source === iframeRef.current.contentWindow;
      if (!isPlayerMessage) return;

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
  }, [song, canNext, onNext, onPlayPause, isPlaying]);

  return (
    <div className="w-full border-t bg-white px-4 py-3 flex flex-row items-between justify-between">
      <div className="flex items-center gap-3 w-150">
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
                <p className="text-xs text-gray-500 truncate">{song.artist}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No track loaded</p>
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
      <div className="flex items-center gap-2 w-full max-w-xs">
        <Volume2 className="text-gray-500" size={16} />
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

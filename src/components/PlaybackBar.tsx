import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import type { SongRowProps } from "./Playlist";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";

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
  const {
    iframeRef,
    embedSrc,
    volume,
    setVolume,
    duration,
    hasDuration,
    timelineValue,
    onSeekValueChange,
    onSeekCommit,
    onIframeLoad,
  } = useYouTubePlayer({
    videoId: song?.videoId ?? null,
    isPlaying,
    canNext,
    onNext,
    onPlayPause,
  });

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
            onValueChange={onSeekValueChange}
            onValueCommit={onSeekCommit}
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
          onLoad={onIframeLoad}
          className="absolute h-0 w-0 opacity-0 pointer-events-none"
        />
      ) : null}
    </div>
  );
}

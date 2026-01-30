import { useCallback, useEffect, useMemo, useState } from "react";
import type { SongRowProps } from "../components/Playlist";

type PlaybackSong = Extract<SongRowProps, { isSong: true }>;

export function usePlaybackControl(songs: PlaybackSong[]) {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (songs.length === 0) {
      setCurrentIndex(null);
      setIsPlaying(false);
      return;
    }
    if (currentIndex === null) {
      setCurrentIndex(0);
      setIsPlaying(true);
      return;
    }
    if (currentIndex >= songs.length) {
      setCurrentIndex(songs.length - 1);
    }
  }, [songs.length, currentIndex]);

  const currentSong = useMemo(() => {
    if (currentIndex === null) return null;
    return songs[currentIndex] ?? null;
  }, [currentIndex, songs]);

  const canPrev = currentIndex !== null && currentIndex > 0;
  const canNext =
    currentIndex !== null && currentIndex < Math.max(songs.length - 1, 0);

  const playPause = useCallback(() => {
    if (!currentSong) return;
    setIsPlaying((prev) => !prev);
  }, [currentSong]);

  const playFromSidebar = useCallback(() => {
    if (!currentSong) return;
    setIsPlaying(true);
  }, [currentSong]);

  const next = useCallback(() => {
    if (!songs.length) return;
    setCurrentIndex((prev) => {
      if (prev === null) return 0;
      return Math.min(prev + 1, songs.length - 1);
    });
    setIsPlaying(true);
  }, [songs.length]);

  const prev = useCallback(() => {
    if (!songs.length) return;
    setCurrentIndex((prev) => {
      if (prev === null) return 0;
      return Math.max(prev - 1, 0);
    });
    setIsPlaying(true);
  }, [songs.length]);

  const resetPlayback = useCallback(() => {
    setCurrentIndex(null);
    setIsPlaying(false);
  }, []);

  return {
    currentIndex,
    currentSong,
    isPlaying,
    canNext,
    canPrev,
    playPause,
    playFromSidebar,
    next,
    prev,
    resetPlayback,
  };
}

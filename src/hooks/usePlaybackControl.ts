import { useCallback, useEffect, useMemo, useState } from "react";
import type { SongRowProps } from "../components/Playlist";

export function usePlaybackControl(
  items: SongRowProps[],
  isReady: boolean,
) {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      setCurrentIndex(null);
      setIsPlaying(false);
      return;
    }
    if (!isReady) {
      return;
    }
    if (currentIndex === null) {
      setCurrentIndex(0);
      setIsPlaying(true);
      return;
    }
    if (currentIndex >= items.length) {
      setCurrentIndex(items.length - 1);
    }
  }, [items.length, currentIndex, isReady]);

  const currentItem = useMemo(() => {
    if (currentIndex === null) return null;
    return items[currentIndex] ?? null;
  }, [currentIndex, items]);

  const canPrev = currentIndex !== null && currentIndex > 0;
  const canNext =
    currentIndex !== null && currentIndex < Math.max(items.length - 1, 0);

  const playPause = useCallback(() => {
    if (!currentItem || !isReady) return;
    setIsPlaying((prev) => !prev);
  }, [currentItem, isReady]);

  const playFromSidebar = useCallback(() => {
    if (!currentItem || !isReady) return;
    setIsPlaying(true);
  }, [currentItem, isReady]);

  const next = useCallback(() => {
    if (!items.length || !isReady) return;
    setCurrentIndex((prev) => {
      if (prev === null) return 0;
      return Math.min(prev + 1, items.length - 1);
    });
    setIsPlaying(true);
  }, [items.length, isReady]);

  const prev = useCallback(() => {
    if (!items.length || !isReady) return;
    setCurrentIndex((prev) => {
      if (prev === null) return 0;
      return Math.max(prev - 1, 0);
    });
    setIsPlaying(true);
  }, [items.length, isReady]);

  const resetPlayback = useCallback(() => {
    setCurrentIndex(null);
    setIsPlaying(false);
  }, []);

  return {
    currentIndex,
    currentItem,
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

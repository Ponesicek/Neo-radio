import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SongRowProps } from "../components/Playlist";
import { formatTimeOfDay } from "../lib/time";
import { parseIsoDurationToSeconds } from "../lib/utils";

export function usePlaylist() {
  const [playlist, setPlaylist] = useState<SongRowProps[]>([]);
  const playlistStartRef = useRef<Date | null>(null);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onPlaylistItem((item) => {
      setPlaylist((prev) => {
        const startTime = playlistStartRef.current ?? new Date();
        if (!playlistStartRef.current) {
          playlistStartRef.current = startTime;
        }
        const elapsedSeconds = prev.reduce((total, entry) => {
          if (entry.isSong) return total + entry.durationSeconds;
          return total + (entry.durationSeconds ?? 0);
        }, 0);
        const durationSeconds = parseIsoDurationToSeconds(item.duration);
        const playTime = new Date(startTime.getTime() + elapsedSeconds * 1000);

        return [
          ...prev,
          {
            isSong: true,
            timeOfPlay: formatTimeOfDay(playTime),
            artist: item.artist,
            name: item.name,
            thumbnailUrl: item.thumbnailUrl,
            videoId: item.ID,
            durationSeconds,
          },
        ];
      });
    });
    return unsubscribe;
  }, []);

  const songs = useMemo(
    () =>
      playlist.filter(
        (item): item is Extract<SongRowProps, { isSong: true }> => item.isSong,
      ),
    [playlist],
  );

  const resetPlaylist = useCallback(() => {
    setPlaylist([]);
    playlistStartRef.current = null;
  }, []);

  return { playlist, songs, resetPlaylist };
}

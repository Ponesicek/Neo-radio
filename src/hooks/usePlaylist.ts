import { useCallback, useEffect, useRef, useState } from "react";
import type { SongRowProps } from "../components/Playlist";
import type { PlaylistItem } from "../preload";
import { formatTimeOfDay } from "../lib/time";
import { parseIsoDurationToSeconds } from "../lib/utils";

export function usePlaylist() {
  const [playlist, setPlaylist] = useState<SongRowProps[]>([]);
  const playlistStartRef = useRef<Date | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isNewsItem = (
    entry: PlaylistItem,
  ): entry is Extract<PlaylistItem, { isSong: false }> => !entry.isSong;

  useEffect(() => {
    const unsubscribeItems = window.electronAPI.onPlaylistItem((item) => {
      setPlaylist((prev) => {
        const startTime = playlistStartRef.current ?? new Date();
        if (!playlistStartRef.current) {
          playlistStartRef.current = startTime;
        }
        const elapsedSeconds = prev.reduce((total, entry) => {
          if (entry.isSong) return total + entry.durationSeconds;
          return total + (entry.durationSeconds ?? 0);
        }, 0);
        const playTime = new Date(startTime.getTime() + elapsedSeconds * 1000);

        if (!isNewsItem(item)) {
          const durationSeconds = parseIsoDurationToSeconds(item.duration);
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
        }

        const durationSeconds = item.durationSeconds;
        return [
          ...prev,
          {
            isSong: false,
            timeOfPlay: formatTimeOfDay(playTime),
            NewsContent: item.newsText,
            durationSeconds,
            newsId: item.newsId,
          },
        ];
      });
    });

    const unsubscribeReady = window.electronAPI.onPlaylistReady(() => {
      setIsReady(true);
    });

    return () => {
      unsubscribeItems();
      unsubscribeReady();
    };
  }, []);

  const resetPlaylist = useCallback(() => {
    setPlaylist([]);
    playlistStartRef.current = null;
    setIsReady(false);
  }, []);

  return { playlist, resetPlaylist, isReady };
}

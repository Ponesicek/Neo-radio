import { useCallback, useEffect, useRef, useState } from "react";
import type { SongRowProps } from "../components/Playlist";
import type { PlaylistItem } from "../preload";
import { formatTimeOfDay } from "../lib/time";
import { parseIsoDurationToSeconds } from "../lib/utils";

const isNewsItem = (
  entry: PlaylistItem,
): entry is Extract<PlaylistItem, { isSong: false }> => !entry.isSong;

const getElapsedSeconds = (entries: SongRowProps[]) =>
  entries.reduce((total, entry) => {
    if (entry.isSong) return total + entry.durationSeconds;
    return total + (entry.durationSeconds ?? 0);
  }, 0);

const createPlaylistRow = (
  item: PlaylistItem,
  startTime: Date,
  elapsedSeconds: number,
): SongRowProps => {
  const playTime = new Date(startTime.getTime() + elapsedSeconds * 1000);
  if (!isNewsItem(item)) {
    const durationSeconds = parseIsoDurationToSeconds(item.duration);
    return {
      isSong: true,
      timeOfPlay: formatTimeOfDay(playTime),
      artist: item.artist,
      name: item.name,
      thumbnailUrl: item.thumbnailUrl,
      videoId: item.ID,
      durationSeconds,
    };
  }

  const durationSeconds = item.durationSeconds;
  return {
    isSong: false,
    timeOfPlay: formatTimeOfDay(playTime),
    NewsContent: item.newsText,
    durationSeconds,
    newsId: item.newsId,
  };
};

export function usePlaylist() {
  const [playlist, setPlaylist] = useState<SongRowProps[]>([]);
  const playlistStartRef = useRef<Date | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribeItems = window.electronAPI.onPlaylistItem((item) => {
      setPlaylist((prev) => {
        const startTime = playlistStartRef.current ?? new Date();
        if (!playlistStartRef.current) {
          playlistStartRef.current = startTime;
        }
        const elapsedSeconds = getElapsedSeconds(prev);
        const nextEntry = createPlaylistRow(item, startTime, elapsedSeconds);
        return [...prev, nextEntry];
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

  const loadPlaylist = useCallback((items: PlaylistItem[]) => {
    const startTime = new Date();
    let elapsedSeconds = 0;
    const rows: SongRowProps[] = [];
    items.forEach((item) => {
      rows.push(createPlaylistRow(item, startTime, elapsedSeconds));
      if (isNewsItem(item)) {
        elapsedSeconds += item.durationSeconds ?? 0;
      } else {
        elapsedSeconds += parseIsoDurationToSeconds(item.duration);
      }
    });
    setPlaylist(rows);
    playlistStartRef.current = rows.length ? startTime : null;
    setIsReady(rows.length > 0);
  }, []);

  return { playlist, resetPlaylist, isReady, loadPlaylist };
}

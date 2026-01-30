import {
  OptionsSidebar,
  type PlaylistRowData,
} from "./components/OptionsSidabar";
import { Separator } from "./components/ui/separator";
import { Playlist, type SongRowProps } from "./components/Playlist";
import { PlaybackBar } from "./components/PlaybackBar";
import { usePlaybackControl } from "./hooks/usePlaybackControl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlaylist } from "./hooks/usePlaylist";
import { usePlaylistGeneration } from "./hooks/usePlaylistGeneration";
import type { PlaylistItem, SavedPlaylist } from "./preload";

export default function App() {
  const { playlist, resetPlaylist, isReady, loadPlaylist } = usePlaylist();
  const {
    currentItem,
    currentIndex,
    isPlaying,
    canNext,
    canPrev,
    playPause,
    next,
    prev,
    resetPlayback,
  } = usePlaybackControl(playlist, isReady);
  const { isGenerating, generate } = usePlaylistGeneration({
    resetPlaylist,
    resetPlayback,
  });
  const [savedPlaylists, setSavedPlaylists] = useState<PlaylistRowData[]>([]);
  const [lastGeneratedItems, setLastGeneratedItems] = useState<PlaylistItem[]>(
    [],
  );
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState("");
  const [lastGeneratedNewsFrequency, setLastGeneratedNewsFrequency] =
    useState(0);
  const [canSave, setCanSave] = useState(false);
  const mapPlaylistToRow = useCallback(
    (entry: SavedPlaylist): PlaylistRowData => ({
      id: entry.id,
      name: entry.name,
    }),
    [],
  );
  const refreshPlaylists = useCallback(async () => {
    const entries = await window.electronAPI.listPlaylists();
    setSavedPlaylists(entries.map(mapPlaylistToRow));
  }, [mapPlaylistToRow]);
  const handleGenerate = useCallback(
    async (prompt: string, newsFrequency: number) => {
      const items = await generate(prompt, newsFrequency);
      const nextItems = Array.isArray(items) ? items : [];
      setLastGeneratedItems(nextItems);
      setLastGeneratedPrompt(prompt);
      setLastGeneratedNewsFrequency(newsFrequency);
      setCanSave(nextItems.length > 0);
    },
    [generate],
  );
  const handleSave = useCallback(
    async (name: string) => {
      if (!lastGeneratedItems.length) return;
      const trimmedName = name.trim();
      if (!trimmedName) return;
      const updated = await window.electronAPI.savePlaylist({
        name: trimmedName,
        prompt: lastGeneratedPrompt,
        newsFrequency: lastGeneratedNewsFrequency,
        items: lastGeneratedItems,
      });
      setSavedPlaylists(updated.map(mapPlaylistToRow));
      setCanSave(false);
    },
    [
      lastGeneratedItems,
      lastGeneratedPrompt,
      lastGeneratedNewsFrequency,
      mapPlaylistToRow,
    ],
  );
  const handleLoad = useCallback(
    async (playlistId: string) => {
      resetPlaylist();
      resetPlayback();
      const items = await window.electronAPI.loadPlaylist(playlistId);
      loadPlaylist(items);
      setCanSave(false);
      setLastGeneratedItems([]);
      setLastGeneratedPrompt("");
      setLastGeneratedNewsFrequency(0);
    },
    [resetPlayback, resetPlaylist, loadPlaylist],
  );
  const handleDelete = useCallback(
    async (playlistId: string) => {
      const updated = await window.electronAPI.deletePlaylist(playlistId);
      setSavedPlaylists(updated.map(mapPlaylistToRow));
    },
    [mapPlaylistToRow],
  );
  const activeVideoId =
    isPlaying && currentItem?.isSong ? currentItem.videoId : null;
  const upcomingVideoIds = useMemo(() => {
    if (currentIndex === null) return [];
    return playlist
      .slice(currentIndex + 1)
      .filter(
        (item): item is Extract<SongRowProps, { isSong: true }> => item.isSong,
      )
      .map((item) => item.videoId);
  }, [playlist, currentIndex]);

  useEffect(() => {
    refreshPlaylists().catch(() => { });
  }, [refreshPlaylists]);

  return (
    <div className="h-screen w-full bg-background flex flex-col">
      <div className="flex flex-1 p-4 gap-4 overflow-hidden">
        <OptionsSidebar
          playlists={savedPlaylists}
          onGenerate={handleGenerate}
          onSave={handleSave}
          onLoadPlaylist={handleLoad}
          onDeletePlaylist={handleDelete}
          isGenerating={isGenerating}
          canSave={canSave}
          defaultSaveName={lastGeneratedPrompt}
        />
        <Separator orientation="vertical" />
        <div className="flex-1 overflow-auto">
          <Playlist items={playlist} activeVideoId={activeVideoId} />
        </div>
      </div>
      <PlaybackBar
        item={currentItem}
        upcomingVideoIds={upcomingVideoIds}
        isPlaying={isPlaying}
        onPlayPause={playPause}
        onNext={next}
        onPrev={prev}
        canNext={canNext}
        canPrev={canPrev}
      />
    </div>
  );
}

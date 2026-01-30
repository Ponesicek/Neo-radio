import {
  OptionsSidebar,
  type PlaylistRowData,
} from "./components/OptionsSidabar";
import { Separator } from "./components/ui/separator";
import { Playlist, type SongRowProps } from "./components/Playlist";
import { PlaybackBar } from "./components/PlaybackBar";
import { usePlaybackControl } from "./hooks/usePlaybackControl";
import { useMemo } from "react";
import { usePlaylist } from "./hooks/usePlaylist";
import { usePlaylistGeneration } from "./hooks/usePlaylistGeneration";

const samplePlaylists: PlaylistRowData[] = [
  { name: "Rock" },
  { name: "Metal" },
  { name: "Jazz" },
  { name: "Classical" },
  { name: "Electronic" },
];

export default function App() {
  const { playlist, resetPlaylist, isReady } = usePlaylist();
  const {
    currentItem,
    currentIndex,
    isPlaying,
    canNext,
    canPrev,
    playPause,
    playFromSidebar,
    next,
    prev,
    resetPlayback,
  } = usePlaybackControl(playlist, isReady);
  const { isGenerating, generate } = usePlaylistGeneration({
    resetPlaylist,
    resetPlayback,
  });
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

  return (
    <div className="h-screen w-full bg-background flex flex-col">
      <div className="flex flex-1 p-4 gap-4 overflow-hidden">
        <OptionsSidebar
          playlists={samplePlaylists}
          onGenerate={generate}
          isGenerating={isGenerating}
          hasGenerated={isReady}
          onPlay={playFromSidebar}
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

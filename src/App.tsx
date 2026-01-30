import {
  OptionsSidebar,
  type PlaylistRowData,
} from "./components/OptionsSidabar";
import { Separator } from "./components/ui/separator";
import { Playlist } from "./components/Playlist";
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
  const { playlist, songs, resetPlaylist } = usePlaylist();
  const {
    currentSong,
    currentIndex,
    isPlaying,
    canNext,
    canPrev,
    playPause,
    playFromSidebar,
    next,
    prev,
    resetPlayback,
  } = usePlaybackControl(songs);
  const { isGenerating, generate } = usePlaylistGeneration({
    resetPlaylist,
    resetPlayback,
  });
  const activeVideoId =
    isPlaying && currentSong ? currentSong.videoId : null;
  const upcomingVideoIds = useMemo(() => {
    if (currentIndex === null) return [];
    return songs
      .slice(currentIndex + 1, currentIndex + 6)
      .map((item) => item.videoId);
  }, [songs, currentIndex]);

  return (
    <div className="h-screen w-full bg-background flex flex-col">
      <div className="flex flex-1 p-4 gap-4 overflow-hidden">
        <OptionsSidebar
          playlists={samplePlaylists}
          onGenerate={generate}
          isGenerating={isGenerating}
          hasGenerated={songs.length > 0}
          onPlay={playFromSidebar}
        />
        <Separator orientation="vertical" />
        <div className="flex-1 overflow-auto">
          <Playlist items={playlist} activeVideoId={activeVideoId} />
        </div>
      </div>
      <PlaybackBar
        song={currentSong}
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

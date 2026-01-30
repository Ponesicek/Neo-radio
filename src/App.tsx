import { useEffect, useMemo, useRef, useState } from "react";
import {
  OptionsSidebar,
  type PlaylistRowData,
} from "./components/OptionsSidabar";
import { Separator } from "./components/ui/separator";
import { Playlist, type SongRowProps } from "./components/Playlist";
import { PlaybackBar } from "./components/PlaybackBar";
import { parseIsoDurationToSeconds } from "./lib/utils";

const samplePlaylists: PlaylistRowData[] = [
  { name: "Rock" },
  { name: "Metal" },
  { name: "Jazz" },
  { name: "Classical" },
  { name: "Electronic" },
];

function formatTimeOfDay(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function App() {
  const [playlist, setPlaylist] = useState<SongRowProps[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setPlaylist([]);
    setCurrentIndex(null);
    setIsPlaying(false);
    playlistStartRef.current = null;
    try {
      await window.electronAPI.generatePlaylist(prompt);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentSong = currentIndex === null ? null : songs[currentIndex];
  const canPrev = currentIndex !== null && currentIndex > 0;
  const canNext =
    currentIndex !== null && currentIndex < Math.max(songs.length - 1, 0);
  const activeVideoId =
    isPlaying && currentSong ? currentSong.videoId : null;

  const handlePlayPause = () => {
    if (!currentSong) return;
    setIsPlaying((prev) => !prev);
  };

  const handlePlayFromSidebar = () => {
    if (!currentSong) return;
    setIsPlaying(true);
  };

  const handleNext = () => {
    if (!songs.length) return;
    setCurrentIndex((prev) => {
      if (prev === null) return 0;
      return Math.min(prev + 1, songs.length - 1);
    });
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (!songs.length) return;
    setCurrentIndex((prev) => {
      if (prev === null) return 0;
      return Math.max(prev - 1, 0);
    });
    setIsPlaying(true);
  };

  return (
    <div className="h-screen w-full bg-background flex flex-col">
      <div className="flex flex-1 p-4 gap-4 overflow-hidden">
        <OptionsSidebar
          playlists={samplePlaylists}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          hasGenerated={songs.length > 0}
          onPlay={handlePlayFromSidebar}
        />
        <Separator orientation="vertical" />
        <div className="flex-1 overflow-auto">
          <Playlist items={playlist} activeVideoId={activeVideoId} />
        </div>
      </div>
      <PlaybackBar
        song={currentSong}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
        canNext={canNext}
        canPrev={canPrev}
      />
    </div>
  );
}

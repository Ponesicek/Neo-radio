import { useEffect, useState } from "react";
import {
  OptionsSidebar,
  type PlaylistRowData,
} from "./components/OptionsSidabar";
import { Separator } from "./components/ui/separator";
import { Playlist, type SongRowProps } from "./components/Playlist";

const samplePlaylists: PlaylistRowData[] = [
  { name: "Rock" },
  { name: "Metal" },
  { name: "Jazz" },
  { name: "Classical" },
  { name: "Electronic" },
];

export default function App() {
  const [playlist, setPlaylist] = useState<SongRowProps[]>([]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onPlaylistItem((item) => {
      setPlaylist((prev) => [
        ...prev,
        {
          isSong: true,
          timeOfPlay: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          artist: item.artist,
          name: item.name,
          thumbnailUrl: item.thumbnailUrl,
        },
      ]);
    });
    return unsubscribe;
  }, []);

  const handleGenerate = async (prompt: string) => {
    setPlaylist([]);
    await window.electronAPI.generatePlaylist(prompt);
  };

  return (
    <div className="h-screen w-full bg-gray-100 flex p-4 gap-4">
      <OptionsSidebar playlists={samplePlaylists} onGenerate={handleGenerate} />
      <Separator orientation="vertical" />
      <Playlist items={playlist} />
    </div>
  );
}

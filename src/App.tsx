import { OptionsSidebar, type PlaylistRowData } from "./components/OptionsSidabar";
import { Separator } from "./components/ui/separator";
import { Playlist, type SongRowProps } from "./components/Playlist";

const samplePlaylists: PlaylistRowData[] = [
  { name: "Rock" },
  { name: "Metal" },
  { name: "Jazz" },
  { name: "Classical" },
  { name: "Electronic" }
];

const samplePlaylist: SongRowProps[] = [
  {
    isSong: true,
    timeOfPlay: "13:30",
    artist: "Beatles",
    name: "Yesterday",
    thumbnailUrl: "https://mirrors.creativecommons.org/presskit/buttons/88x31/png/cc-zero.png"
  },
  {
    isSong: true,
    timeOfPlay: "13:34",
    artist: "Queen",
    name: "Bohemian Rhapsody",
    thumbnailUrl: "https://mirrors.creativecommons.org/presskit/buttons/88x31/png/cc-zero.png"
  },
  {
    isSong: false,
    timeOfPlay: "13:40",
    NewsContent: "Breaking news: sky is blue"
  },
  {
    isSong: true,
    timeOfPlay: "13:45",
    artist: "Led Zeppelin",
    name: "Stairway to Heaven",
    thumbnailUrl: "https://mirrors.creativecommons.org/presskit/buttons/88x31/png/cc-zero.png"
  }
];

export default function App() {
  return (
    <div className="h-screen w-full bg-gray-100 flex p-4 gap-4">
      <OptionsSidebar playlists={samplePlaylists} />
      <Separator orientation="vertical" />
      <Playlist items={samplePlaylist} />
    </div>
  );
}

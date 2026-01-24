import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ThumbsUp, Trash2, ThumbsDown } from "lucide-react";

type SongRowProps =
  | {
      isSong: true;
      timeOfPlay: string;
      thumbnailUrl: string;
      name: string;
      artist: string;
    }
  | {
      isSong: false;
      timeOfPlay: string;
      NewsContent: string;
    };

interface PlaylistProps {
  items: SongRowProps[];
}

function Playlist({ items }: PlaylistProps) {
  return (
    <Table>
      <TableBody>
        {items.map((item, index) => (
          <SongRow key={index} {...item} />
        ))}
      </TableBody>
    </Table>
  );
}

function SongRow(props: SongRowProps) {
  if (props.isSong) {
    return (
      <TableRow className="flex flex-row w-full justify-between h-16">
        <TableCell>
          <div className="flex items-center gap-4">
            <span>{props.timeOfPlay}</span>
            <img
              src={props.thumbnailUrl}
              style={{ height: "40px", width: "71px", objectFit: "fill" }}
            />
            <div className="flex flex-col">
              <p className="font-bold">{props.name}</p>
              <p>{props.artist}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="items-center flex flex-row gap-2">
          <button>
            <ThumbsUp size={16} />
          </button>
          <button>
            <Trash2 size={16} />
          </button>
          <button>
            <ThumbsDown size={16} />
          </button>
        </TableCell>
      </TableRow>
    );
  }

  const newsProps = props as {
    isSong: false;
    timeOfPlay: string;
    NewsContent: string;
  };
  return (
    <TableRow className="flex flex-row w-full justify-between h-16">
      <TableCell>
        <div className="flex items-center gap-4">
          <span>{newsProps.timeOfPlay}</span>
          <p className="h-[40px] w-[71px] flex items-center justify-center text-center">
            | | | | | | | | | |
          </p>
          <p>{newsProps.NewsContent}</p>
        </div>
      </TableCell>
      <TableCell className="items-center flex flex-row gap-2">
        <button>
          <ThumbsUp size={16} />
        </button>
        <button>
          <Trash2 size={16} />
        </button>
        <button>
          <ThumbsDown size={16} />
        </button>
      </TableCell>
    </TableRow>
  );
}

export { Playlist, type SongRowProps };

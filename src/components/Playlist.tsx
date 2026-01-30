import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ThumbsUp, Trash2, ThumbsDown } from "lucide-react";

type SongRowProps =
  | {
    isSong: true;
    timeOfPlay: string;
    thumbnailUrl: string;
    name: string;
    artist: string;
    videoId: string;
    durationSeconds: number;
  }
  | {
    isSong: false;
    timeOfPlay: string;
    NewsContent: string;
    durationSeconds?: number;
  };

interface PlaylistProps {
  items: SongRowProps[];
  activeVideoId?: string | null;
}

type SongRowDisplayProps = SongRowProps & {
  isActive?: boolean;
};

function Playlist({ items, activeVideoId }: PlaylistProps) {
  return (
    <Table>
      <TableBody>
        {items.map((item, index) => (
          <SongRow
            key={index}
            {...item}
            isActive={item.isSong && item.videoId === activeVideoId}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function SongRow(props: SongRowDisplayProps) {
  if (props.isSong) {
    return (
      <TableRow
        className={cn(
          "flex flex-row w-full justify-between h-16 items-center",
          props.isActive && "bg-muted/70",
        )}
        data-state={props.isActive ? "selected" : undefined}
        aria-current={props.isActive ? "true" : undefined}
      >
        <TableCell>
          <div className="flex items-center gap-4">
            <span>{props.timeOfPlay}</span>
            <img
              src={props.thumbnailUrl}
              style={{ height: "40px", minWidth: "71px", maxWidth: "71px", objectFit: "fill" }}
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

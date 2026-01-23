import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ThumbsUp, Trash2, ThumbsDown } from "lucide-react";

type SongRowProps =
  | ({ isSong: true } & {
      timeOfPlay: string;
      thumbnailUrl: string;
      name: string;
      artist: string;
    })
  | ({ isSong: false } & {
      NewsContent: string;
      timeOfPlay: string;
    });

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
  return (
    <TableRow className="flex flex-row w-full justify-between h-16">
      {props.isSong ? (
        <div className="">
          <TableCell>{props.timeOfPlay}</TableCell>
          <TableCell>
            <img
              src={props.thumbnailUrl}
              style={{ height: "40px", width: "71px", objectFit: "fill" }}
            />
          </TableCell>
          <TableCell>
            <div className="flex flex-col">
              <p className="font-bold">{props.name}</p>
              <p>{props.artist}</p>
            </div>
          </TableCell>
        </div>
      ) : (
        <div className="items-center flex">
          <TableCell>{props.timeOfPlay}</TableCell>
          <TableCell>
            <p className="h-[40px] w-[71px] flex items-center justify-center text-center">
              | | | | | | | | | |
            </p>
          </TableCell>
          <TableCell>
            <p>{props.NewsContent}</p>
          </TableCell>
        </div>
      )}
      <div className="items-center flex flex-row gap-2">
        <TableCell>
          <button>
            <ThumbsUp size={16} />
          </button>
        </TableCell>
        <TableCell>
          <button>
            <Trash2 size={16} />
          </button>
        </TableCell>
        <TableCell>
          <button>
            <ThumbsDown size={16} />
          </button>
        </TableCell>
      </div>
    </TableRow>
  );
}

export { Playlist, type SongRowProps };

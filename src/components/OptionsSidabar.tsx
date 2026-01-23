import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { X, ArrowRight } from "lucide-react";

interface PlaylistRowData {
  name: string;
}

interface OptionsSidebarProps {
  playlists: PlaylistRowData[];
}

export function OptionsSidebar({ playlists }: OptionsSidebarProps) {
  return (
    <div className="flex gap-2 flex-col items-center min-w-sm">
      <h2 className="text-xl">How are we feeling?</h2>
      <Textarea
        id="textarea-message"
        placeholder="Type your message here."
        className="select-none"
      />
      <div className="flex flex-row w-full justify-end">
        <Button>Tune in</Button>
      </div>
      <div className="flex flex-row gap-2 w-full">
        <span className="min-w-fit">News frequency: </span>{" "}
        <Slider
          className="w-full "
          min={0}
          max={4}
          step={1}
          defaultValue={[0]}
        />
      </div>
      <Table>
        <TableBody>
          {playlists.map((playlist, index) => (
            <PlaylistRow key={index} name={playlist.name} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PlaylistRow({ name }: { name: string }) {
  return (
    <TableRow>
      <TableCell className="font-medium w-full">{name}</TableCell>
      <TableCell>
        <button>
          <X size={16} />
        </button>
      </TableCell>
      <TableCell className="text-right">
        <button>
          <ArrowRight size={16} />
        </button>
      </TableCell>
    </TableRow>
  );
}

export type { PlaylistRowData };

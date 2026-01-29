import { useState } from "react";
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
  onGenerate: (prompt: string) => Promise<void>;
  onPlay?: () => void;
  isGenerating: boolean;
  hasGenerated: boolean;
}

export function OptionsSidebar({
  playlists,
  onGenerate,
  onPlay,
  isGenerating,
  hasGenerated,
}: OptionsSidebarProps) {
  const [prompt, setPrompt] = useState("");
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState<string | null>(
    null,
  );
  const trimmedPrompt = prompt.trim();
  const isReadyToPlay =
    hasGenerated && !!trimmedPrompt && trimmedPrompt === lastGeneratedPrompt;
  const buttonLabel = isGenerating
    ? "Preparing..."
    : isReadyToPlay
      ? "Play"
      : "Tune in";
  const handleGenerate = async () => {
    if (isGenerating) return;
    if (isReadyToPlay) {
      onPlay?.();
      return;
    }
    if (!trimmedPrompt) return;
    await onGenerate(trimmedPrompt);
    setLastGeneratedPrompt(trimmedPrompt);
  };

  return (
    <div className="flex gap-2 flex-col items-center min-w-sm">
      <h2 className="text-xl">How are we feeling?</h2>
      <Textarea
        id="textarea-message"
        placeholder="Type your message here."
        className="select-none"
        onChange={(e) => setPrompt(e.target.value)}
        value={prompt}
      />
      <div className="flex flex-row w-full justify-end">
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {buttonLabel}
        </Button>
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

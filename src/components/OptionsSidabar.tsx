import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { X, ArrowRight } from "lucide-react";

interface PlaylistRowData {
  id: string;
  name: string;
}

interface OptionsSidebarProps {
  playlists: PlaylistRowData[];
  onGenerate: (prompt: string, newsFrequency: number) => Promise<void>;
  onSave: (name: string) => Promise<void> | void;
  onLoadPlaylist: (playlistId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  isGenerating: boolean;
  canSave: boolean;
  defaultSaveName?: string;
}

export function OptionsSidebar({
  playlists,
  onGenerate,
  onSave,
  onLoadPlaylist,
  onDeletePlaylist,
  isGenerating,
  canSave,
  defaultSaveName,
}: OptionsSidebarProps) {
  const [prompt, setPrompt] = useState("");
  const [newsFrequency, setNewsFrequency] = useState(0);
  const [saveName, setSaveName] = useState("");
  const wasSaveableRef = useRef(false);
  const trimmedPrompt = prompt.trim();
  const buttonLabel = isGenerating
    ? "Preparing..."
    : canSave
      ? "Save"
      : "Tune in";
  const trimmedSaveName = saveName.trim();
  const isActionDisabled =
    isGenerating ||
    (!canSave && !trimmedPrompt) ||
    (canSave && !trimmedSaveName);
  const handleGenerate = async () => {
    if (isGenerating) return;
    if (canSave) {
      if (!trimmedSaveName) return;
      await onSave(trimmedSaveName);
      return;
    }
    if (!trimmedPrompt) return;
    await onGenerate(trimmedPrompt, newsFrequency);
  };

  useEffect(() => {
    if (canSave && !wasSaveableRef.current) {
      const fallbackName =
        defaultSaveName?.trim() || trimmedPrompt || "New playlist";
      setSaveName(fallbackName);
    }
    if (!canSave && wasSaveableRef.current) {
      setSaveName("");
    }
    wasSaveableRef.current = canSave;
  }, [canSave, defaultSaveName, trimmedPrompt]);

  return (
    <div className="flex gap-2 flex-col items-center w-[80%] min-w-3xs max-w-sm">
      <h2 className="text-xl">How are we feeling?</h2>
      <Textarea
        id="textarea-message"
        placeholder="Type your message here."
        className="select-none"
        onChange={(e) => setPrompt(e.target.value)}
        value={prompt}
      />
      {canSave ? (
        <input
          type="text"
          value={saveName}
          onChange={(event) => setSaveName(event.target.value)}
          placeholder="Playlist name"
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          aria-label="Playlist name"
        />
      ) : null}
      <div className="flex flex-row w-full justify-end">
        <Button onClick={handleGenerate} disabled={isActionDisabled}>
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
          value={[newsFrequency]}
          onValueChange={(value) => setNewsFrequency(value[0] ?? 0)}
        />
      </div>
      <Table>
        <TableBody>
          {playlists.map((playlist, index) => (
            <PlaylistRow
              key={playlist.id ?? index}
              id={playlist.id}
              name={playlist.name}
              onDelete={onDeletePlaylist}
              onLoad={onLoadPlaylist}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PlaylistRow({
  id,
  name,
  onDelete,
  onLoad,
}: {
  id: string;
  name: string;
  onDelete: (playlistId: string) => void;
  onLoad: (playlistId: string) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium w-full">{name}</TableCell>
      <TableCell>
        <button type="button" onClick={() => onDelete(id)} aria-label="Delete">
          <X size={16} />
        </button>
      </TableCell>
      <TableCell className="text-right">
        <button type="button" onClick={() => onLoad(id)} aria-label="Load">
          <ArrowRight size={16} />
        </button>
      </TableCell>
    </TableRow>
  );
}

export type { PlaylistRowData };

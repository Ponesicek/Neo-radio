import { useCallback, useState } from "react";

interface PlaylistGenerationOptions {
  resetPlaylist: () => void;
  resetPlayback: () => void;
}

export function usePlaylistGeneration({
  resetPlaylist,
  resetPlayback,
}: PlaylistGenerationOptions) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    async (prompt: string) => {
      setIsGenerating(true);
      resetPlaylist();
      resetPlayback();
      try {
        await window.electronAPI.generatePlaylist(prompt);
      } finally {
        setIsGenerating(false);
      }
    },
    [resetPlayback, resetPlaylist],
  );

  return { isGenerating, generate };
}

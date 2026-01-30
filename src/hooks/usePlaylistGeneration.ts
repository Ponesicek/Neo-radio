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
    async (prompt: string, newsFrequency: number) => {
      setIsGenerating(true);
      resetPlaylist();
      resetPlayback();
      try {
        const items = await window.electronAPI.generatePlaylist(
          prompt,
          newsFrequency,
        );
        return items ?? [];
      } finally {
        setIsGenerating(false);
      }
    },
    [resetPlayback, resetPlaylist],
  );

  return { isGenerating, generate };
}

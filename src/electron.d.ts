import type { PlaylistItem } from "./preload";

declare global {
  interface Window {
    electronAPI: {
      generatePlaylist: (prompt: string) => Promise<PlaylistItem[]>;
      ensureAudio: (
        videoId: string,
      ) => Promise<{ data: ArrayBuffer; mimeType: string }>;
      preloadAudio: (videoId: string) => Promise<void>;
      onPlaylistItem: (callback: (item: PlaylistItem) => void) => () => void;
    };
  }
}

export {};

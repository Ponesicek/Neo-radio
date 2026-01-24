import type { PlaylistItem } from "./preload";

declare global {
  interface Window {
    electronAPI: {
      generatePlaylist: (prompt: string) => Promise<PlaylistItem[]>;
      onPlaylistItem: (callback: (item: PlaylistItem) => void) => () => void;
    };
  }
}

export {};

import type { PlaylistItem } from "./preload";

declare global {
  interface Window {
    electronAPI: {
      generatePlaylist: (
        prompt: string,
        newsFrequency: number,
      ) => Promise<PlaylistItem[]>;
      ensureAudio: (
        videoId: string,
      ) => Promise<{ data: ArrayBuffer; mimeType: string }>;
      ensureNewsAudio: (payload: {
        newsId: string;
        newsText: string;
      }) => Promise<{ data: ArrayBuffer; mimeType: string }>;
      preloadAudio: (videoId: string) => Promise<void>;
      onPlaylistItem: (callback: (item: PlaylistItem) => void) => () => void;
      onPlaylistReady: (callback: () => void) => () => void;
    };
  }
}

export {};

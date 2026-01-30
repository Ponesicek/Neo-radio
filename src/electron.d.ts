import type { PlaylistItem, SavedPlaylist, SavePlaylistPayload } from "./preload";

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
      listPlaylists: () => Promise<SavedPlaylist[]>;
      savePlaylist: (payload: SavePlaylistPayload) => Promise<SavedPlaylist[]>;
      deletePlaylist: (playlistId: string) => Promise<SavedPlaylist[]>;
      loadPlaylist: (playlistId: string) => Promise<PlaylistItem[]>;
      onPlaylistItem: (callback: (item: PlaylistItem) => void) => () => void;
      onPlaylistReady: (callback: () => void) => () => void;
    };
  }
}

export { };

import { contextBridge, ipcRenderer } from "electron";

export type PlaylistItem =
  | {
    isSong: true;
    ID: string;
    name: string;
    artist: string;
    thumbnailUrl: string;
    duration: string;
  }
  | {
    isSong: false;
    newsId: string;
    newsText: string;
    durationSeconds: number;
  };

export type SavedPlaylistSong = Extract<PlaylistItem, { isSong: true }>;

export type SavedPlaylist = {
  id: string;
  name: string;
  prompt: string;
  newsFrequency: number;
  songs: SavedPlaylistSong[];
  createdAt: string;
};

export type SavePlaylistPayload = {
  name: string;
  prompt: string;
  newsFrequency: number;
  items: PlaylistItem[];
};

contextBridge.exposeInMainWorld("electronAPI", {
  generatePlaylist: (prompt: string, newsFrequency: number) =>
    ipcRenderer.invoke("generate-playlist", { prompt, newsFrequency }),
  ensureAudio: (videoId: string) => ipcRenderer.invoke("ensure-audio", videoId),
  ensureNewsAudio: (payload: { newsId: string; newsText: string }) =>
    ipcRenderer.invoke("ensure-news-audio", payload),
  preloadAudio: (videoId: string) => ipcRenderer.invoke("preload-audio", videoId),
  listPlaylists: () => ipcRenderer.invoke("list-playlists"),
  savePlaylist: (payload: SavePlaylistPayload) =>
    ipcRenderer.invoke("save-playlist", payload),
  deletePlaylist: (playlistId: string) =>
    ipcRenderer.invoke("delete-playlist", playlistId),
  loadPlaylist: (playlistId: string) =>
    ipcRenderer.invoke("load-playlist", playlistId),
  onPlaylistItem: (callback: (item: PlaylistItem) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, item: PlaylistItem) =>
      callback(item);
    ipcRenderer.on("playlist-item", handler);
    return () => ipcRenderer.removeListener("playlist-item", handler);
  },
  onPlaylistReady: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("playlist-ready", handler);
    return () => ipcRenderer.removeListener("playlist-ready", handler);
  },
});

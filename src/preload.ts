import { contextBridge, ipcRenderer } from "electron";

export interface PlaylistItem {
  ID: string;
  name: string;
  artist: string;
  thumbnailUrl: string;
  duration: string;
}

contextBridge.exposeInMainWorld("electronAPI", {
  generatePlaylist: (prompt: string) =>
    ipcRenderer.invoke("generate-playlist", prompt),
  ensureAudio: (videoId: string) => ipcRenderer.invoke("ensure-audio", videoId),
  preloadAudio: (videoId: string) => ipcRenderer.invoke("preload-audio", videoId),
  onPlaylistItem: (callback: (item: PlaylistItem) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, item: PlaylistItem) =>
      callback(item);
    ipcRenderer.on("playlist-item", handler);
    return () => ipcRenderer.removeListener("playlist-item", handler);
  },
});

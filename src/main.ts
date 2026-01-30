import { app, BrowserWindow, Menu, ipcMain } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { streamText, Output, stepCountIs } from "ai";
import {
  getCachedVideoDetails,
  searchYoutube,
  showNextForSongYoutube,
} from "./tools";
import { z } from "zod";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}
const openrouter = createOpenRouter()

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  Menu.setApplicationMenu(null);
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.removeHandler("generate-playlist");
ipcMain.handle("generate-playlist", async (event, prompt: string) => {
  const results: Array<{
    ID: string;
    name: string;
    artist: string;
    thumbnailUrl: string;
    duration: string;
  }> = [];
  for await (const item of generatePlaylist(prompt)) {
    results.push(item);
    event.sender.send("playlist-item", item);
  }
  return results;
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
export async function* generatePlaylist(prompt: string) {
  const { elementStream } = streamText({
    system: "You are a helpful assistant that generates a playlist of YouTube videos based on a prompt. You will be given a prompt and you will need to generate a playlist of YouTube videos based on the prompt. You will need to use the searchYoutube tool to search for videos and the showNextForSongYoutube tool to show the next video in the playlist. Prefer to use the ID of the official youtube video, not any compilations or remixes unless the prompt specifically asks for it.",
    model: openrouter("google/gemini-3-flash-preview"),
    prompt: prompt,
    onChunk: (chunk) => {
      console.log(chunk);
    },
    output: Output.array({
      element: z.object({
        videoId: z
          .string()
          .describe(
            "YouTube video ID (the 11-character ID from video URL, e.g. 'dQw4w9WgXcQ')",
          ),
      }),
    }),
    tools: {
      searchYoutube,
      showNextForSongYoutube,
    },
    stopWhen: stepCountIs(20),
  });
  for await (const element of elementStream) {
    const details = await getCachedVideoDetails([element.videoId]);
    const videoInfo = details.get(element.videoId);
    console.log(videoInfo)
    yield {
      ID: element.videoId,
      name: videoInfo?.snippet?.title ?? "",
      artist: videoInfo?.snippet?.channelTitle ?? "",
      thumbnailUrl: videoInfo?.snippet?.thumbnails?.default?.url ?? "",
      duration: videoInfo?.contentDetails?.duration ?? "",
    };
  }
}

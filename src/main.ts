import { app, BrowserWindow, Menu, ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import started from "electron-squirrel-startup";
import { streamText, Output, stepCountIs } from "ai";
import Store from "electron-store";
import {
  getCachedVideoDetails,
  searchYoutube,
  showNextForSongYoutube,
} from "./tools";
import { z } from "zod";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ensureAudioFile } from "./audioDownload";
import { getLatestNews } from "./news";
import { synthetizeSpeech } from "./speech";
import type { StoreSchema, StoredPlaylist } from "./lib/utils";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}
const openrouter = createOpenRouter()
const store = new Store<StoreSchema>();

type SongPlaylistItem = {
  isSong: true;
  ID: string;
  name: string;
  artist: string;
  thumbnailUrl: string;
  duration: string;
};

type NewsPlaylistItem = {
  isSong: false;
  newsId: string;
  newsText: string;
  durationSeconds: number;
};

type PlaylistItem = SongPlaylistItem | NewsPlaylistItem;

const newsAudioTasks = new Map<string, Promise<string>>();

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
ipcMain.handle(
  "generate-playlist",
  async (
    event,
    payload: { prompt: string; newsFrequency: number } | string,
  ) => {
    const request =
      typeof payload === "string"
        ? { prompt: payload, newsFrequency: 0 }
        : payload;
    const newsFrequency = Number.isFinite(request.newsFrequency)
      ? Math.max(0, Math.floor(request.newsFrequency))
      : 0;

    newsAudioTasks.clear();

    const songs: SongPlaylistItem[] = [];
    for await (const item of generatePlaylist(request.prompt)) {
      songs.push(item);
    }

    const results = await buildPlaylistWithNews(songs, newsFrequency);

    for (const item of results) {
      event.sender.send("playlist-item", item);
    }
    event.sender.send("playlist-ready");
    return results;
  },
);

ipcMain.removeHandler("list-playlists");
ipcMain.handle("list-playlists", () => {
  return store.get("playlists", []) ?? [];
});

ipcMain.removeHandler("save-playlist");
ipcMain.handle(
  "save-playlist",
  (
    _event,
    payload: {
      name: string;
      prompt: string;
      newsFrequency: number;
      items: PlaylistItem[];
    },
  ) => {
    const normalizedName = payload?.name?.trim() ?? "";
    const normalizedPrompt = payload?.prompt?.trim() ?? "";
    const name = normalizedName || normalizedPrompt || "Untitled playlist";
    const newsFrequency = Number.isFinite(payload?.newsFrequency)
      ? Math.max(0, Math.floor(payload.newsFrequency))
      : 0;
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const songs = items.filter(
      (item): item is SongPlaylistItem => !!item && item.isSong,
    );

    if (songs.length === 0) {
      return store.get("playlists", []) ?? [];
    }

    const entry: StoredPlaylist = {
      id: randomUUID(),
      name,
      prompt: normalizedPrompt,
      newsFrequency,
      songs,
      createdAt: new Date().toISOString(),
    };
    const existing = (store.get("playlists", []) ?? []) as StoredPlaylist[];
    const updated = [entry, ...existing];
    store.set("playlists", updated);
    return updated;
  },
);

ipcMain.removeHandler("delete-playlist");
ipcMain.handle("delete-playlist", (_event, playlistId: string) => {
  const existing = (store.get("playlists", []) ?? []) as StoredPlaylist[];
  const updated = existing.filter((entry) => entry.id !== playlistId);
  store.set("playlists", updated);
  return updated;
});

ipcMain.removeHandler("load-playlist");
ipcMain.handle("load-playlist", async (_event, playlistId: string) => {
  const existing = (store.get("playlists", []) ?? []) as StoredPlaylist[];
  const playlist = existing.find((entry) => entry.id === playlistId);
  if (!playlist) {
    return [];
  }
  newsAudioTasks.clear();
  return buildPlaylistWithNews(playlist.songs, playlist.newsFrequency);
});

ipcMain.removeHandler("ensure-audio");
ipcMain.handle("ensure-audio", async (_event, videoId: string) => {
  const audioPath = await ensureAudioFile(videoId);
  const data = await fs.readFile(audioPath);
  const buffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  );
  const mimeType = getAudioMimeType(audioPath);
  return { data: buffer, mimeType };
});

ipcMain.removeHandler("preload-audio");
ipcMain.handle("preload-audio", async (_event, videoId: string) => {
  await ensureAudioFile(videoId);
});

ipcMain.removeHandler("ensure-news-audio");
ipcMain.handle(
  "ensure-news-audio",
  async (
    _event,
    payload: { newsId: string; newsText?: string } | string,
  ) => {
    const request =
      typeof payload === "string" ? { newsId: payload } : payload;
    let task = newsAudioTasks.get(request.newsId);
    if (!task && request.newsText) {
      task = synthetizeSpeech(request.newsText);
      newsAudioTasks.set(request.newsId, task);
    }
    if (!task) {
      throw new Error(`Unknown news audio id: ${request.newsId}`);
    }
    const audioPath = await task;
    const data = await fs.readFile(audioPath);
    const buffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    );
    const mimeType = getAudioMimeType(audioPath);
    return { data: buffer, mimeType };
  },
);

function getAudioMimeType(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
    case ".mp4":
      return "audio/mp4";
    case ".webm":
      return "audio/webm";
    case ".opus":
    case ".ogg":
      return "audio/ogg";
    case ".wav":
      return "audio/wav";
    default:
      return "application/octet-stream";
  }
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
export async function* generatePlaylist(
  prompt: string,
): AsyncGenerator<SongPlaylistItem> {
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
      isSong: true,
      ID: element.videoId,
      name: videoInfo?.snippet?.title ?? "",
      artist: videoInfo?.snippet?.channelTitle ?? "",
      thumbnailUrl: videoInfo?.snippet?.thumbnails?.default?.url ?? "",
      duration: videoInfo?.contentDetails?.duration ?? "",
    };
  }
}

async function buildPlaylistWithNews(
  songs: SongPlaylistItem[],
  newsFrequency: number,
): Promise<PlaylistItem[]> {
  if (!newsFrequency || newsFrequency <= 0 || songs.length === 0) {
    return songs;
  }

  const newsItems = await getLatestNews();
  const slotCount = Math.floor(songs.length / newsFrequency);
  if (!slotCount || newsItems.length === 0) {
    return songs;
  }

  const summaries = await summarizeNewsItems(
    newsItems,
    Math.min(slotCount, newsItems.length),
  );

  const newsEntries: NewsPlaylistItem[] = [];
  summaries.forEach((summary) => {
    if (!summary.summary) return;
    const newsId = randomUUID();
    const durationSeconds = estimateSpeechDurationSeconds(summary.summary);
    newsAudioTasks.set(newsId, synthetizeSpeech(summary.summary));
    newsEntries.push({
      isSong: false,
      newsId,
      newsText: summary.summary,
      durationSeconds,
    });
  });

  const combined: PlaylistItem[] = [];
  let newsIndex = 0;
  songs.forEach((song, index) => {
    combined.push(song);
    if ((index + 1) % newsFrequency === 0 && newsIndex < newsEntries.length) {
      combined.push(newsEntries[newsIndex]);
      newsIndex += 1;
    }
  });

  return combined;
}

async function summarizeNewsItems(
  items: Array<{
    title: string;
    description?: string;
    source: string;
  }>,
  count: number,
): Promise<Array<{ index: number; summary: string }>> {
  if (count <= 0 || items.length === 0) {
    return [];
  }

  const promptLines = [
    `Summarize ${count} items from the list below.`,
    "Each summary must be 1-2 sentences.",
    "Return exactly the number requested.",
    "Use the item index provided. Choose distinct indices.",
    "Avoid markdown, quotes, or extra keys.",
    "",
    "News items:",
    ...items.map((item, index) => {
      const description = (item.description ?? "").replace(/\s+/g, " ").trim();
      const trimmedDescription =
        description.length > 320
          ? `${description.slice(0, 317)}...`
          : description;
      return `${index}. Title: ${item.title} | Source: ${item.source} | Description: ${trimmedDescription}`;
    }),
  ];

  const { elementStream } = streamText({
    system:
      "You are a concise news editor. Produce accurate, neutral summaries.",
    model: openrouter("google/gemini-3-flash-preview"),
    prompt: promptLines.join("\n"),
    output: Output.array({
      element: z.object({
        index: z.number().int().min(0).max(items.length - 1),
        summary: z
          .string()
          .describe("1-2 sentence summary without bullet points"),
      }),
    }),
    stopWhen: stepCountIs(10),
  });

  const results: Array<{ index: number; summary: string }> = [];
  for await (const element of elementStream) {
    results.push(element);
  }

  const used = new Set<number>();
  const normalized: Array<{ index: number; summary: string }> = [];
  results.forEach((entry) => {
    const summary = normalizeSummary(entry.summary);
    if (!summary || used.has(entry.index)) return;
    used.add(entry.index);
    normalized.push({ index: entry.index, summary });
  });

  if (normalized.length >= count) {
    return normalized.slice(0, count);
  }

  for (let i = 0; i < items.length && normalized.length < count; i += 1) {
    if (used.has(i)) continue;
    const fallback = normalizeSummary(
      `${items[i].title}. ${items[i].description ?? ""}`,
    );
    if (!fallback) continue;
    used.add(i);
    normalized.push({ index: i, summary: fallback });
  }

  return normalized;
}

function normalizeSummary(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return limitToSentences(cleaned, 2);
}

function limitToSentences(text: string, maxSentences: number): string {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!matches) return text.trim();
  return matches.slice(0, maxSentences).join(" ").trim();
}

function estimateSpeechDurationSeconds(text: string): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const wordsPerSecond = 2.5;
  return Math.max(5, Math.ceil(wordCount / wordsPerSecond));
}

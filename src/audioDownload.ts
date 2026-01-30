import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execYtDlp } from "./ytdlp";

const cacheDir = path.join(os.tmpdir(), "better-radio");
const inFlightDownloads = new Map<string, Promise<string>>();

async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(cacheDir, { recursive: true });
}

async function findCachedAudio(videoId: string): Promise<string | null> {
  try {
    const files = await fs.readdir(cacheDir);
    const match = files.find(
      (file) =>
        file.startsWith(`${videoId}.`) &&
        !file.endsWith(".part") &&
        !file.endsWith(".ytdl"),
    );
    return match ? path.join(cacheDir, match) : null;
  } catch {
    return null;
  }
}

export async function ensureAudioFile(videoId: string): Promise<string> {
  if (!videoId) {
    throw new Error("Missing video ID.");
  }

  const existing = await findCachedAudio(videoId);
  if (existing) {
    return existing;
  }

  const inFlight = inFlightDownloads.get(videoId);
  if (inFlight) {
    return inFlight;
  }

  const downloadPromise = (async () => {
    await ensureCacheDir();
    const outputTemplate = path.join(cacheDir, "%(id)s.%(ext)s");
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    await execYtDlp([
      url,
      "--no-playlist",
      "--no-part",
      "--no-progress",
      "-f",
      "bestaudio",
      "-o",
      outputTemplate,
    ]);

    const downloaded = await findCachedAudio(videoId);
    if (!downloaded) {
      throw new Error(`Audio download for ${videoId} did not produce a file.`);
    }
    return downloaded;
  })();

  inFlightDownloads.set(videoId, downloadPromise);
  try {
    return await downloadPromise;
  } finally {
    inFlightDownloads.delete(videoId);
  }
}

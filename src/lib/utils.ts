import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type StoredPlaylistSong = {
  isSong: true;
  ID: string;
  name: string;
  artist: string;
  thumbnailUrl: string;
  duration: string;
};

export type StoredPlaylist = {
  id: string;
  name: string;
  prompt: string;
  newsFrequency: number;
  songs: StoredPlaylistSong[];
  createdAt: string;
};

export interface StoreSchema {
  music: {
    youtube: {
      useMusic: {
        type: "boolean";
        default: true;
      };
    };
  };
  news: {
    speech: {
      provider: {
        type: "kokoro" | "openAI" | "azure" | "elevenlabs";
        default: "kokoro";
      };
    };
    providers: {
      rss: {
        type: "Array<string>";
        default: ["https://news.ycombinator.com/rss"];
      }
    };
  };
  youtubeApiKey: string;
  playlists?: StoredPlaylist[];
}

export function parseDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function parseIsoDurationToSeconds(isoDuration: string): number {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  return hours * 3600 + minutes * 60 + seconds;
}


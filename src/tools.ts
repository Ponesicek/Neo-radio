import { tool } from "ai";
import { z } from "zod";
import Store from "electron-store";
import { youtube } from "@googleapis/youtube";
import { parseDuration } from "./lib/utils";

export interface StoreSchema {
  music: {
    youtube: {
      useMusic: {
        type: "boolean";
        default: true;
      };
    };
  };
  youtubeApiKey: string;
}

const store = new Store<StoreSchema>();

const youtubeClient = youtube({
  version: "v3",
  auth: store.get("youtubeApiKey") || process.env.YOUTUBE_API_KEY,
});

const videoCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export async function getCachedVideoDetails(videoIds: string[]) {
  const now = Date.now();
  const uncachedIds: string[] = [];
  const results: Map<string, any> = new Map();

  for (const id of videoIds) {
    const cached = videoCache.get(id);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      results.set(id, cached.data);
    } else {
      uncachedIds.push(id);
    }
  }

  if (uncachedIds.length > 0) {
    const videoDetails = await youtubeClient.videos.list({
      part: ["contentDetails", "snippet"],
      id: uncachedIds,
    });

    videoDetails.data.items?.forEach((video) => {
      if (video.id) {
        videoCache.set(video.id, { data: video, timestamp: now });
        results.set(video.id, video);
      }
    });
  }

  return results;
}

export const searchYoutube = tool({
  description: "Search Youtube for videos matching a query",
  inputSchema: z.object({
    query: z.string().describe("What to search for on Youtube"),
    maxResults: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .optional()
      .describe("Number of results (1-10, default 5)"),
  }),
  execute: async ({ query, maxResults = 5 }) => {
    const result: Array<{
      VideoId: string;
      Name: string;
      Author: string;
      AuthorId: string;
      length: string;
    }> = [];

    const response = await youtubeClient.search.list({
      part: ["snippet"],
      q: query,
      type: ["video"],
      maxResults,
      videoCategoryId: store.get("music.youtube.useMusic") ? "10" : undefined,
    });

    if (response.data.items) {
      const videoIds = response.data.items
        .map((item) => item.id?.videoId)
        .filter((id): id is string => !!id);

      const videoDetails = await getCachedVideoDetails(videoIds);

      response.data.items.forEach((item) => {
        const videoId = item.id?.videoId;
        if (videoId && item.snippet) {
          const details = videoDetails.get(videoId);
          result.push({
            VideoId: videoId,
            Name: item.snippet.title ?? "",
            Author: item.snippet.channelTitle ?? "",
            AuthorId: item.snippet.channelId ?? "",
            length: details?.contentDetails?.duration
              ? parseDuration(details.contentDetails.duration)
              : "",
          });
        }
      });
    }

    return result;
  },
});

const channelCache = new Map<
  string,
  { channelId: string; timestamp: number }
>();

export const showNextForSongYoutube = tool({
  description: "Get up next / related songs for a given video ID",
  inputSchema: z.object({
    videoId: z
      .string()
      .describe("The YouTube video ID to get up next songs for"),
    maxResults: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .optional()
      .describe("Number of results (1-10, default 5)"),
  }),
  execute: async ({ videoId, maxResults = 5 }) => {
    const result: Array<{
      VideoId: string;
      Name: string;
      Author: string;
      AuthorId: string;
      length: string;
    }> = [];
    let channelId: string;
    const cached = channelCache.get(videoId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      channelId = cached.channelId;
    } else {
      const videoDetails = await getCachedVideoDetails([videoId]);
      const video = videoDetails.get(videoId);
      if (!video?.snippet?.channelId) {
        return result;
      }
      channelId = video.snippet.channelId;
      channelCache.set(videoId, { channelId, timestamp: Date.now() });
    }

    const response = await youtubeClient.search.list({
      part: ["snippet"],
      channelId,
      type: ["video"],
      maxResults: maxResults + 1,
      videoCategoryId: store.get("music.youtube.useMusic") ? "10" : undefined,
    });

    if (response.data.items) {
      const videoIds = response.data.items
        .map((item) => item.id?.videoId)
        .filter((id): id is string => !!id && id !== videoId);

      if (videoIds.length > 0) {
        const videoDetails = await getCachedVideoDetails(videoIds);

        response.data.items.forEach((item) => {
          const vid = item.id?.videoId;
          if (vid && vid !== videoId && item.snippet) {
            const details = videoDetails.get(vid);
            result.push({
              VideoId: vid,
              Name: item.snippet.title ?? "",
              Author: item.snippet.channelTitle ?? "",
              AuthorId: item.snippet.channelId ?? "",
              length: details?.contentDetails?.duration
                ? parseDuration(details.contentDetails.duration)
                : "",
            });
          }
        });
      }
    }

    return result.slice(0, maxResults);
  },
});

import { tool } from "ai";
import { z } from "zod";
import Store from "electron-store";
import YTMusic from "ytmusic-api";
import { Innertube } from "youtubei.js";
import Video from "youtubei.js/dist/src/parser/classes/Video";
import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";

const innertube = await Innertube.create();
const ytmusic = new YTMusic();
await ytmusic.initialize();
export interface StoreSchema {
  music: {
    youtube: {
      useMusic: {
        type: "boolean";
        default: true;
      };
    };
  };
}

const store = new Store<StoreSchema>();

export const searchYoutube = tool({
  description: "Search Youtube for videos matching a query",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "What to search for on" + store.get("music.youtube.useMusic")
          ? "Youtube music"
          : "Youtube",
      ),
    page: z
      .number()
      .optional()
      .describe("The page number of results to return"),
  }),
  execute: async ({ query }) => {
    const result: Array<{
      VideoId: string;
      Name: string;
      Author: string;
      AuthorId: string;
      length: string;
    }> = [];
    if (store.get("music.youtube.useMusic")) {
      const res = await ytmusic.search(query);
      res.forEach((e) => {
        if (e.type === "SONG" || e.type === "VIDEO") {
          result.push({
            VideoId: e.videoId,
            Name: e.name,
            Author: e.artist.name,
            AuthorId: e.artist.artistId,
            length: e.duration
              ? `${Math.floor(e.duration / 60)}:${String(e.duration % 60).padStart(2, "0")}`
              : "",
          });
        }
      });
    } else {
      const res = await innertube.search(query, { type: "video" });
      res.videos.forEach((e: Video) => {
        result.push({
          VideoId: e.video_id,
          Name: e.title.text,
          Author: e.author?.name,
          AuthorId: e.author?.id,
          length: e.duration?.text,
        });
      });
    }
    return result;
  },
});

console.log(
  (
    await generateText({
      model: openai("gpt-5"),
      prompt: "Look up shadow on the wall and tell me what it returned",
      tools: {
        searchYoutube,
      },
      stopWhen: stepCountIs(10),
    })
  ).content,
);

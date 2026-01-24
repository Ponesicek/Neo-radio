import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import OpenAI from "openai";
import Store from "electron-store";
import { StoreSchema } from "./lib/utils";

const store = new Store<StoreSchema>();
const execFileAsync = promisify(execFile);

const KOKORO_BASE_URL = "http://localhost:8880/v1";
const KOKORO_VOICES_URL = `${KOKORO_BASE_URL}/audio/voices`;
const KOKORO_IMAGE = "ghcr.io/remsky/kokoro-fastapi-cpu:latest";
const KOKORO_VOICE = "af_bella";
const KOKORO_MODEL = "kokoro";
const KOKORO_PORT = "8880:8880";
const KOKORO_STARTUP_TIMEOUT_MS = 120_000;
const KOKORO_POLL_INTERVAL_MS = 2_000;

let kokoroReady = false;
let kokoroStartPromise: Promise<void> | null = null;

async function isKokoroRunning(): Promise<boolean> {
  if (kokoroReady) {
    return true;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_500);
  try {
    const response = await fetch(KOKORO_VOICES_URL, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) {
      return false;
    }
    kokoroReady = true;
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForKokoroReady(): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < KOKORO_STARTUP_TIMEOUT_MS) {
    if (await isKokoroRunning()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, KOKORO_POLL_INTERVAL_MS));
  }
  throw new Error("Kokoro did not start in time.");
}

//docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest # CPU, or:
//docker run--gpus all - p 8880: 8880 ghcr.io / remsky / kokoro - fastapi - gpu:latest  #NVIDIA GPU
export async function setUpKokoro(): Promise<void> {
  if (await isKokoroRunning()) {
    return;
  }
  if (kokoroStartPromise) {
    await kokoroStartPromise;
    return;
  }
  kokoroStartPromise = (async () => {
    if (!(await isKokoroRunning())) {
      await execFileAsync("docker", [
        "run",
        "--rm",
        "-d",
        "-p",
        KOKORO_PORT,
        KOKORO_IMAGE,
      ]);
    }
    await waitForKokoroReady();
  })();
  try {
    await kokoroStartPromise;
  } finally {
    kokoroStartPromise = null;
  }
}

async function synthesizeWithKokoro(text: string): Promise<Buffer> {
  await setUpKokoro();
  const client = new OpenAI({
    baseURL: KOKORO_BASE_URL,
    apiKey: "not-needed",
  });
  const response = await client.audio.speech.create({
    model: KOKORO_MODEL,
    voice: KOKORO_VOICE,
    input: text,
    response_format: "mp3",
  });
  return Buffer.from(await response.arrayBuffer());
}

async function synthesizeWithOpenAI(text: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
  }
  const client = new OpenAI({ apiKey });
  const response = await client.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: text,
    response_format: "mp3",
  });
  return Buffer.from(await response.arrayBuffer());
}

async function synthesizeWithAzure(text: string): Promise<Buffer> {
  const apiKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!apiKey || !region) {
    throw new Error(
      "AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables must be set."
    );
  }
  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
      <voice name="en-US-JennyNeural">${escapeXml(text)}</voice>
    </speak>
  `.trim();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
    },
    body: ssml,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure TTS failed: ${response.status} - ${errorText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function synthesizeWithElevenLabs(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable is not set.");
  }
  // Default voice: Rachel
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs TTS failed: ${response.status} - ${errorText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function synthetizeSpeech(text: string): Promise<string> {
  const provider = store.get("news.speech.provider") ?? "kokoro";

  let audioBuffer: Buffer;
  switch (provider) {
    case "kokoro":
      audioBuffer = await synthesizeWithKokoro(text);
      break;
    case "openAI":
      audioBuffer = await synthesizeWithOpenAI(text);
      break;
    case "azure":
      audioBuffer = await synthesizeWithAzure(text);
      break;
    case "elevenlabs":
      audioBuffer = await synthesizeWithElevenLabs(text);
      break;
    default:
      throw new Error(`Speech provider "${provider}" is not supported.`);
  }

  const outputDir = path.join(os.tmpdir(), "better-radio");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `speech-${randomUUID()}.mp3`);
  await fs.writeFile(outputPath, audioBuffer);
  return outputPath;
}

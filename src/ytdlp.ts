import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";

const githubReleaseUrl =
  "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest";

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
};

type GithubRelease = {
  assets?: ReleaseAsset[];
};

function getAssetName(): string {
  if (process.platform === "win32") return "yt-dlp.exe";
  if (process.platform === "darwin") return "yt-dlp_macos";
  return "yt-dlp";
}

function getBinaryPath(): string {
  const binaryDir = path.join(app.getPath("userData"), "yt-dlp");
  const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  return path.join(binaryDir, binaryName);
}

async function downloadFile(url: string, destination: string): Promise<void> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/octet-stream",
      "User-Agent": "better-radio",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download yt-dlp: ${response.statusText}`);
  }

  const data = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destination, data);
  if (process.platform !== "win32") {
    await fs.chmod(destination, 0o755);
  }
}

async function downloadYtDlpBinary(binaryPath: string): Promise<void> {
  const response = await fetch(githubReleaseUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "better-radio",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch yt-dlp release: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as GithubRelease;
  const assetName = getAssetName();
  const asset = payload.assets?.find((entry) => entry.name === assetName);

  if (!asset) {
    throw new Error(`No yt-dlp asset found for ${assetName}.`);
  }

  await downloadFile(asset.browser_download_url, binaryPath);
}

export async function ensureYtDlpBinary(): Promise<string> {
  const binaryPath = getBinaryPath();

  try {
    await fs.access(binaryPath);
    return binaryPath;
  } catch {
    await fs.mkdir(path.dirname(binaryPath), { recursive: true });
    await downloadYtDlpBinary(binaryPath);
    return binaryPath;
  }
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const message = [
        `yt-dlp exited with code ${code ?? "unknown"}.`,
        stdout.trim(),
        stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n");
      reject(new Error(message));
    });
  });
}

export async function execYtDlp(args: string[]): Promise<void> {
  const binaryPath = await ensureYtDlpBinary();
  await runCommand(binaryPath, args);
}

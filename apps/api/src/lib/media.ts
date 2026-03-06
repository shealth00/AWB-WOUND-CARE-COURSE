import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { apiEnv } from "../env.js";

export type MediaType = "video" | "audio" | "pdf";

export interface MediaDetection {
  mediaType: MediaType;
  mimeType: string;
  extension: string;
}

const MIME_EXTENSION_MAP: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "application/pdf": "pdf",
};

const TEMP_UPLOAD_DIR = path.join(os.tmpdir(), "awb-academy-media-upload");

export function getMediaRootDir(): string {
  return path.resolve(apiEnv.MEDIA_STORAGE_DIR);
}

export function getMediaTempDir(): string {
  return TEMP_UPLOAD_DIR;
}

export async function ensureMediaStorageDirectories(): Promise<void> {
  await fs.mkdir(getMediaRootDir(), { recursive: true });
  await fs.mkdir(getMediaTempDir(), { recursive: true });
}

export function detectMedia(fileName: string, mimeType: string): MediaDetection | null {
  const normalizedMimeType = mimeType.toLowerCase();
  const extensionFromName = path.extname(fileName).replace(".", "").toLowerCase();
  const extensionFromMime = MIME_EXTENSION_MAP[normalizedMimeType] ?? extensionFromName;

  if (normalizedMimeType === "application/pdf" || extensionFromName === "pdf") {
    return {
      mediaType: "pdf",
      mimeType: "application/pdf",
      extension: "pdf",
    };
  }

  if (normalizedMimeType.startsWith("video/")) {
    return {
      mediaType: "video",
      mimeType: normalizedMimeType,
      extension: extensionFromMime || "bin",
    };
  }

  if (normalizedMimeType.startsWith("audio/")) {
    return {
      mediaType: "audio",
      mimeType: normalizedMimeType,
      extension: extensionFromMime || "bin",
    };
  }

  if (["mp4", "webm", "mov", "avi"].includes(extensionFromName)) {
    return {
      mediaType: "video",
      mimeType: normalizedMimeType || "application/octet-stream",
      extension: extensionFromName,
    };
  }

  if (["mp3", "m4a", "wav", "ogg"].includes(extensionFromName)) {
    return {
      mediaType: "audio",
      mimeType: normalizedMimeType || "application/octet-stream",
      extension: extensionFromName,
    };
  }

  return null;
}

export async function moveUploadToMediaStorage(input: {
  tempPath: string;
  assetId: string;
  extension: string;
}): Promise<{ absolutePath: string; relativePath: string; storageName: string }> {
  const safeExtension = input.extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const shard = input.assetId.slice(0, 2);
  const storageDir = path.join(getMediaRootDir(), shard);
  const storageName = safeExtension ? `${input.assetId}.${safeExtension}` : input.assetId;
  const absolutePath = path.join(storageDir, storageName);

  await fs.mkdir(storageDir, { recursive: true });
  await fs.rename(input.tempPath, absolutePath);

  return {
    absolutePath,
    relativePath: path.relative(getMediaRootDir(), absolutePath),
    storageName,
  };
}

export function resolveStoredMediaPath(relativePath: string): string {
  const root = getMediaRootDir();
  const resolved = path.resolve(root, relativePath);

  if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid media storage path.");
  }

  return resolved;
}

export function safeFileName(fileName: string): string {
  const normalized = fileName.replace(/[^a-z0-9._-]/gi, "_");
  return normalized.length > 0 ? normalized : "asset";
}

export async function inspectMediaProcessing(
  mediaType: MediaType,
  absolutePath: string,
): Promise<{
  durationSec: number | null;
  pageCount: number | null;
  notes: string | null;
}> {
  if (mediaType === "pdf") {
    const pageCount = await getPdfPageCount(absolutePath);
    return {
      durationSec: null,
      pageCount,
      notes: pageCount === null ? "Unable to determine PDF page count." : null,
    };
  }

  const durationSec = await getMediaDurationSeconds(absolutePath);
  return {
    durationSec,
    pageCount: null,
    notes: durationSec === null ? "Unable to determine media duration." : null,
  };
}

export function parseByteRange(rangeHeader: string, fileSize: number): {
  start: number;
  end: number;
} | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());

  if (!match) {
    return null;
  }

  const startRaw = match[1];
  const endRaw = match[2];
  const hasStart = startRaw.length > 0;
  const hasEnd = endRaw.length > 0;

  if (!hasStart && !hasEnd) {
    return null;
  }

  if (hasStart && hasEnd) {
    const start = Number.parseInt(startRaw, 10);
    const end = Number.parseInt(endRaw, 10);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= fileSize) {
      return null;
    }

    return {
      start,
      end: Math.min(end, fileSize - 1),
    };
  }

  if (hasStart) {
    const start = Number.parseInt(startRaw, 10);

    if (!Number.isFinite(start) || start >= fileSize) {
      return null;
    }

    return {
      start,
      end: fileSize - 1,
    };
  }

  const suffixLength = Number.parseInt(endRaw, 10);

  if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
    return null;
  }

  const start = Math.max(fileSize - suffixLength, 0);
  return {
    start,
    end: fileSize - 1,
  };
}

async function getPdfPageCount(absolutePath: string): Promise<number | null> {
  try {
    const buffer = await fs.readFile(absolutePath);
    const text = buffer.toString("latin1");
    const matches = text.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : null;
  } catch {
    return null;
  }
}

async function getMediaDurationSeconds(absolutePath: string): Promise<number | null> {
  return new Promise<number | null>((resolve) => {
    const process = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      absolutePath,
    ]);

    let stdout = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        process.kill("SIGKILL");
        resolve(null);
      }
    }, 8000);

    process.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    process.on("error", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(null);
      }
    });

    process.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (code !== 0) {
        resolve(null);
        return;
      }

      const parsed = Number.parseFloat(stdout.trim());
      if (!Number.isFinite(parsed) || parsed <= 0) {
        resolve(null);
        return;
      }

      resolve(Math.round(parsed));
    });
  });
}

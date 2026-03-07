import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { apiEnv } from "../env.js";

type BuildCourseLessonInput = {
  lessonId?: string;
  lessonCode?: string;
  course?: string;
  track?: string;
  module?: string;
  moduleTitle?: string;
  title?: string;
  lessonTitle?: string;
  runtime?: number;
  script?: string;
  scriptPath?: string;
  slides?: Array<{
    id?: string;
    layout?: "title" | "bullets" | "callout" | "outro";
    title: string;
    bullets?: string[];
    callout?: string;
    narration: string;
  }>;
  scenes?: Array<{
    id?: string;
    scene?: number;
    slide: string;
    narration: string;
    estimatedDurationSec?: number;
  }>;
  ttsProvider?: "aws-polly" | "openai-tts";
  voiceId?: string;
  voiceEngine?: "standard" | "neural" | "long-form" | "generative";
  openAiModel?: string;
  publishAfterGenerate?: boolean;
  overwriteExistingVideo?: boolean;
  updateLessonVideoUrl?: boolean;
  syncSmartsheetVideoUrl?: boolean;
};

type ManifestInput =
  | BuildCourseLessonInput[]
  | {
      lessons: BuildCourseLessonInput[];
    };

function getArgValue(flag: string): string | null {
  const exact = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (exact) {
    return exact.slice(flag.length + 1);
  }

  const index = process.argv.indexOf(flag);
  if (index >= 0) {
    return process.argv[index + 1] ?? null;
  }

  return null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag) || process.argv.some((arg) => arg.startsWith(`${flag}=`));
}

async function loadManifest(filePath: string): Promise<BuildCourseLessonInput[]> {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as ManifestInput;
  const lessons = Array.isArray(parsed) ? parsed : parsed.lessons;

  if (!Array.isArray(lessons) || lessons.length === 0) {
    throw new Error("Manifest must contain a non-empty lessons array.");
  }

  return lessons;
}

async function resolveScript(input: BuildCourseLessonInput): Promise<string | undefined> {
  if (input.script && input.script.trim().length > 0) {
    return input.script;
  }

  if (!input.scriptPath) {
    return undefined;
  }

  const absolutePath = path.resolve(process.cwd(), input.scriptPath);
  const content = await fs.readFile(absolutePath, "utf8");
  return content.trim() || undefined;
}

async function queueLesson(
  apiBaseUrl: string,
  adminKey: string,
  lesson: BuildCourseLessonInput,
): Promise<{ jobId: string; lessonId: string | null }> {
  const script = await resolveScript(lesson);
  const lessonTitle = lesson.lessonTitle ?? lesson.title;
  const moduleTitle = lesson.moduleTitle ?? lesson.module;

  if (!lessonTitle) {
    throw new Error("Each lesson requires lessonTitle or title.");
  }

  if (!moduleTitle) {
    throw new Error(`Lesson ${lesson.lessonCode ?? lessonTitle} is missing module/moduleTitle.`);
  }

  if (!lesson.track) {
    throw new Error(`Lesson ${lesson.lessonCode ?? lessonTitle} is missing track.`);
  }

  if (!script && (!lesson.slides || lesson.slides.length === 0) && (!lesson.scenes || lesson.scenes.length === 0)) {
    throw new Error(`Lesson ${lesson.lessonCode ?? lessonTitle} requires script, slides, or scenes.`);
  }

  const payload = {
    lessonId: lesson.lessonId,
    lessonCode: lesson.lessonCode,
    course: lesson.course,
    track: lesson.track,
    module: lesson.module,
    moduleTitle,
    title: lesson.title,
    lessonTitle,
    runtime: lesson.runtime,
    script,
    slides: lesson.slides,
    scenes: lesson.scenes,
    ttsProvider: lesson.ttsProvider,
    voiceId: lesson.voiceId,
    voiceEngine: lesson.voiceEngine,
    openAiModel: lesson.openAiModel,
    publishAfterGenerate: lesson.publishAfterGenerate ?? false,
    overwriteExistingVideo: lesson.overwriteExistingVideo ?? true,
    updateLessonVideoUrl: lesson.lessonId ? (lesson.updateLessonVideoUrl ?? true) : false,
    syncSmartsheetVideoUrl: lesson.lessonId ? (lesson.syncSmartsheetVideoUrl ?? true) : false,
  };

  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/admin/videos/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { error?: string; jobId?: string; lessonId?: string | null };
  if (!response.ok || !data.jobId) {
    throw new Error(data.error ?? `Queue request failed (${response.status}).`);
  }

  return {
    jobId: data.jobId,
    lessonId: data.lessonId ?? null,
  };
}

async function waitForJobs(
  apiBaseUrl: string,
  adminKey: string,
  jobs: Array<{ jobId: string; lessonId: string | null }>,
  pollSeconds: number,
): Promise<void> {
  const pending = new Set(jobs.map((job) => job.jobId));

  while (pending.size > 0) {
    for (const jobId of [...pending]) {
      const response = await fetch(
        `${apiBaseUrl.replace(/\/$/, "")}/api/admin/videos/generate/${encodeURIComponent(jobId)}`,
        {
          headers: {
            "x-admin-key": adminKey,
          },
        },
      );
      const data = (await response.json()) as {
        status?: string;
        lessonId?: string | null;
        assetId?: string | null;
        assetContentUrl?: string | null;
        errorMessage?: string | null;
      };

      if (!response.ok) {
        throw new Error(`Polling failed for ${jobId} (${response.status}).`);
      }

      if (data.status === "completed") {
        const publicUrl = data.assetContentUrl ? `${apiBaseUrl.replace(/\/$/, "")}${data.assetContentUrl}` : null;
        console.log(
          `[completed] job=${jobId} lesson=${data.lessonId ?? "ad-hoc"} asset=${data.assetId ?? "none"} url=${publicUrl ?? "n/a"}`,
        );
        pending.delete(jobId);
      } else if (data.status === "failed") {
        throw new Error(`Job ${jobId} failed: ${data.errorMessage ?? "Unknown error."}`);
      }
    }

    if (pending.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, pollSeconds * 1000));
    }
  }
}

async function main(): Promise<void> {
  const file = getArgValue("--file");
  if (!file) {
    throw new Error("Usage: npm run build-course --workspace @awb/api -- --file /path/to/lessons.json [--wait]");
  }

  const apiBaseUrl = getArgValue("--api") ?? process.env.VIDEO_GENERATION_API_BASE_URL ?? "http://127.0.0.1:4000";
  const adminKey = getArgValue("--admin-key") ?? process.env.ADMIN_API_KEY ?? apiEnv.ADMIN_API_KEY;
  const wait = hasFlag("--wait");
  const pollSeconds = Number.parseInt(getArgValue("--poll-seconds") ?? "20", 10);

  if (!adminKey || adminKey.length < 8) {
    throw new Error("Admin API key is required. Set ADMIN_API_KEY or pass --admin-key.");
  }

  const lessons = await loadManifest(file);
  const queued: Array<{ jobId: string; lessonId: string | null }> = [];

  for (const lesson of lessons) {
    const queuedJob = await queueLesson(apiBaseUrl, adminKey, lesson);
    queued.push(queuedJob);
    console.log(`[queued] job=${queuedJob.jobId} lesson=${queuedJob.lessonId ?? lesson.lessonCode ?? "ad-hoc"}`);
  }

  if (wait) {
    await waitForJobs(apiBaseUrl, adminKey, queued, Number.isFinite(pollSeconds) && pollSeconds > 0 ? pollSeconds : 20);
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown build-course error.";
  console.error(message);
  process.exit(1);
});

import { createHash, randomUUID } from "node:crypto";
import { createReadStream, mkdirSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import express from "express";
import multer from "multer";
import cron from "node-cron";
import {
  ALLOWED_REQUEST_TYPES,
  ALLOWED_SITE_TYPES,
  ALLOWED_WOUND_TYPES,
  PASSING_SCORE,
  VIDEO_COMPLETION_THRESHOLD,
  buildQuiz,
  calculateWoundAreaReduction,
  evaluateEscalation,
  generateDebridementNote,
  generateAuditReadyWoundNote,
  generateCertificateId,
  gradeQuiz,
  normalizeTrackKey,
  routeIvr,
  scoreDebridementDocumentation,
  scoreAuditReadyWoundNote,
  suggestDebridementCptCode,
  splitList,
  type RequestType,
  type QuizSubmissionAnswer,
  type SiteType,
  type WoundType,
} from "@awb/lms-core";
import { PROGRAM_CATALOG, PROGRAM_TRACKS } from "@awb/lms-core/program";
import { z } from "zod";
import { apiEnv } from "./env.js";
import {
  assertShareRole,
  getAdminIdentity,
  getMemberIdentity,
  hashMemberPassword,
  issueAdminToken,
  issueMemberToken,
  requireAdmin,
  requireMember,
  verifyMemberPassword,
} from "./lib/auth.js";
import { buildCertificatePresentation } from "./lib/certificates.js";
import { buildCertificateHtml, resolveCertificateTemplateDefaults } from "./lib/certificateTemplate.js";
import { initializeDatabase, insertAuditLog, insertVerificationLookup, query, recordSyncRun } from "./lib/db.js";
import { ensureDemoCatalogAndQuestions, resetOperationalData } from "./lib/demoSeed.js";
import { canAccessCertificatePdf, renderPdfFromHtml } from "./lib/pdf.js";
import { uploadCertificatePdf } from "./lib/pdfStorage.js";
import {
  detectMedia,
  ensureMediaStorageDirectories,
  getMediaTempDir,
  inferMimeTypeFromFileName,
  inspectMediaProcessing,
  type MediaType,
  moveUploadToMediaStorage,
  parseByteRange,
  resolveStoredMediaPath,
  safeFileName,
} from "./lib/media.js";
import {
  createWebhookFromEnv,
  addRowByColumnTitle,
  attachFileToRow,
  attachLinkToRow,
  getSheet,
  getSmartsheetHealthReport,
  isSmartsheetConfigured,
  shareSheet,
  smartsheetIds,
  updateRowByColumnTitle,
} from "./lib/smartsheet.js";
import { getLesson, listLessonsByTrack, listTracks, syncContent } from "./lib/sync.js";
import { enforceVerifyRateLimit, getDisplayLearnerName } from "./lib/verify.js";
import { cleanupGeneratedLessonArtifacts, generateLessonVideo } from "./lib/videoGeneration.js";

export const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 5,
    fileSize: 20 * 1024 * 1024,
  },
});
const mediaTempDir = getMediaTempDir();
mkdirSync(mediaTempDir, { recursive: true });
const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, mediaTempDir);
    },
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname);
      callback(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: {
    files: 1,
    fileSize: 800 * 1024 * 1024,
  },
});

app.use(express.json({ limit: "2mb" }));

interface HeroExperimentVariantConfig {
  id: "a" | "b";
  label: string;
  eyebrow: string;
  headline: string;
  body: string;
  bullets: string[];
  stats: Array<{
    value: string;
    label: string;
  }>;
  primaryCta: {
    id: string;
    label: string;
    href: string;
  };
  secondaryCta: {
    id: string;
    label: string;
    href: string;
  };
}

const HERO_EXPERIMENT = {
  id: "catalog-hero-v1",
  name: "Catalog Hero Messaging",
  status: "active",
  hypothesis:
    "Audit-forward versus workflow-forward homepage messaging changes catalog engagement and downstream CTA activity.",
  qa: {
    overrideParam: "abVariant",
    debugParam: "debug",
  },
  variants: [
    {
      id: "a",
      label: "Audit-forward",
      eyebrow: "Compliance-first launch path",
      headline: "Audit-ready wound-care learning with measurable progression",
      body:
        "This variant leads with documentation integrity, quiz gating, certificate verification, and LCD-centered learner readiness for providers, facilities, and commercial teams.",
      bullets: [
        "Five audience tracks with gated module progression",
        "Quizzes, final exams, and certificate verification in one system",
        "Shared LCD documentation workflow across clinic, facility, and field teams",
      ],
      stats: [
        { value: "5", label: "audience tracks" },
        { value: "90%", label: "lesson completion threshold" },
        { value: "80%", label: "exam pass mark" },
      ],
      primaryCta: {
        id: "catalog-primary",
        label: "Browse learning paths",
        href: "#catalog",
      },
      secondaryCta: {
        id: "lcd-secondary",
        label: "Review LCD updates",
        href: "/lcd-updates",
      },
    },
    {
      id: "b",
      label: "Workflow-forward",
      eyebrow: "Operations-first launch path",
      headline: "Training, intake, forms, and admin follow-through in one workflow",
      body:
        "This variant emphasizes end-to-end operating flow: course delivery, facility packets, intake routing, troubleshooting, and admin reporting under the same AWB Academy stack.",
      bullets: [
        "Track learner flow from catalog to certificate without leaving the platform",
        "Route facility packets, training requests, and follow-up forms through one operational layer",
        "Give admins visible diagnostics, reset controls, and experiment reporting for QA",
      ],
      stats: [
        { value: "3", label: "ops forms in platform" },
        { value: "1", label: "admin troubleshooting console" },
        { value: "24/7", label: "self-serve certificate verification" },
      ],
      primaryCta: {
        id: "catalog-primary",
        label: "Start the catalog flow",
        href: "#catalog",
      },
      secondaryCta: {
        id: "forms-secondary",
        label: "Open intake forms",
        href: "/forms",
      },
    },
  ] satisfies HeroExperimentVariantConfig[],
} as const;

const experimentEventSchema = z.object({
  experimentId: z.string().trim().min(1),
  variantId: z.string().trim().min(1),
  eventType: z.enum(["impression", "cta-click"]),
  sessionKey: z.string().trim().min(1).max(160),
  userId: z.string().trim().min(1).max(160).optional(),
  path: z.string().trim().min(1).max(600).optional(),
  metadata: z.record(z.unknown()).optional(),
});

function resolveHeroExperimentVariant(variantId: string) {
  return HERO_EXPERIMENT.variants.find((variant) => variant.id === variantId);
}

function buildHeroExperimentConfig() {
  return {
    experimentId: HERO_EXPERIMENT.id,
    name: HERO_EXPERIMENT.name,
    status: HERO_EXPERIMENT.status,
    hypothesis: HERO_EXPERIMENT.hypothesis,
    qa: HERO_EXPERIMENT.qa,
    variants: HERO_EXPERIMENT.variants,
  };
}

function hashTokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

interface MediaAssetRow {
  asset_id: string;
  title: string;
  description: string | null;
  media_type: "video" | "audio" | "pdf";
  mime_type: string;
  file_ext: string;
  file_size: string;
  storage_name: string;
  storage_path: string;
  duration_sec: number | null;
  page_count: number | null;
  processing_status: string;
  processing_notes: string | null;
  created_by: string;
  created_at: string;
}

function mapMediaAsset(row: MediaAssetRow) {
  const normalizedMimeType =
    row.mime_type && row.mime_type !== "application/octet-stream"
      ? row.mime_type
      : (inferMimeTypeFromFileName(row.storage_name) ?? row.mime_type);

  return {
    assetId: row.asset_id,
    title: row.title,
    description: row.description,
    mediaType: row.media_type,
    mimeType: normalizedMimeType,
    fileExt: row.file_ext,
    fileSize: Number(row.file_size),
    storageName: row.storage_name,
    durationSec: row.duration_sec,
    pageCount: row.page_count,
    processingStatus: row.processing_status,
    processingNotes: row.processing_notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    contentUrl: `/api/assets/${encodeURIComponent(row.asset_id)}/content`,
  };
}

interface VideoGenerationRequestPayload {
  lessonId: string | null;
  lessonCode: string | null;
  lessonTitle: string;
  moduleTitle: string;
  track: string;
  owner: string;
  runtimeSec: number | null;
  script: string | null;
  slides: Array<{
    id: string;
    layout: "title" | "bullets" | "callout" | "outro";
    title: string;
    bullets: string[];
    callout: string | null;
    narration: string;
  }> | null;
  ttsProvider: "aws-polly" | "openai-tts";
  voiceId: string;
  voiceEngine: "standard" | "neural" | "long-form" | "generative";
  openAiModel: string;
  renderWidth: number;
  renderHeight: number;
  renderFps: number;
  brandLogoUrl: string | null;
  brandPrimaryColor: string;
  brandAccentColor: string;
  brandFontFamily: string;
  updateLessonVideoUrl: boolean;
  syncSmartsheetVideoUrl: boolean;
  publishAfterGenerate: boolean;
  overwriteExistingVideo: boolean;
}

interface VideoGenerationJobRow {
  job_id: string;
  lesson_id: string | null;
  source_row_id: string | null;
  asset_id: string | null;
  status: string;
  voice_id: string;
  request_payload: unknown;
  warnings: unknown;
  error_message: string | null;
  created_by: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const canonicalSlideSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  layout: z.enum(["title", "bullets", "callout", "outro"]).default("bullets"),
  title: z.string().trim().min(1).max(220),
  bullets: z.array(z.string().trim().min(1).max(240)).max(4).optional(),
  callout: z.string().trim().min(1).max(320).optional(),
  narration: z.string().trim().min(1).max(2000),
});

const canonicalSceneSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  scene: z.coerce.number().int().positive().max(500).optional(),
  slide: z.string().trim().min(1).max(220),
  narration: z.string().trim().min(1).max(2000),
  estimatedDurationSec: z.coerce.number().positive().max(3600).optional(),
});

const videoGenerationPayloadSchema = z
  .object({
  course: z.string().trim().min(1).max(160).optional(),
  module: z.string().trim().min(1).max(220).optional(),
  lessonCode: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().min(1).max(220).optional(),
  runtime: z.coerce.number().int().positive().max(7200).optional(),
  lessonId: z.string().trim().min(1).optional(),
  lessonTitle: z.string().trim().min(1).max(220).optional(),
  moduleTitle: z.string().trim().min(1).max(220).optional(),
  track: z.string().trim().min(1).max(140).optional(),
  owner: z.string().trim().min(1).max(140).optional(),
  lessonMeta: z
    .object({
      track: z.string().trim().min(1).max(140).optional(),
      moduleTitle: z.string().trim().min(1).max(220).optional(),
      lessonTitle: z.string().trim().min(1).max(220).optional(),
    })
    .optional(),
  script: z.string().trim().min(1).max(apiEnv.VIDEO_GENERATION_MAX_SCRIPT_CHARS).optional(),
  slides: z.array(canonicalSlideSchema).min(1).max(50).optional(),
  scenes: z.array(canonicalSceneSchema).min(1).max(80).optional(),
  ttsProvider: z.enum(["aws-polly", "openai-tts"]).optional(),
  voiceId: z.string().trim().min(1).max(80).default(apiEnv.VIDEO_GENERATION_DEFAULT_VOICE),
  voiceEngine: z.enum(["standard", "neural", "long-form", "generative"]).default("neural"),
  openAiModel: z.string().trim().min(1).max(120).optional(),
  voice: z
    .object({
      provider: z.enum(["aws-polly", "openai-tts"]).optional(),
      voiceId: z.string().trim().min(1).max(80),
      engine: z.enum(["standard", "neural", "long-form", "generative"]).default("neural"),
      model: z.string().trim().min(1).max(120).optional(),
    })
    .optional(),
  render: z
    .object({
      width: z.coerce.number().int().positive().max(7680).default(1920),
      height: z.coerce.number().int().positive().max(4320).default(1080),
      fps: z.coerce.number().int().positive().max(120).default(30),
    })
    .optional(),
  brand: z
    .object({
      logoUrl: z.string().trim().url().optional(),
      primaryColor: z.string().trim().min(4).max(20).optional(),
      accentColor: z.string().trim().min(4).max(20).optional(),
      fontFamily: z.string().trim().min(1).max(120).optional(),
    })
    .optional(),
  publishAfterGenerate: z.coerce.boolean().optional(),
  overwriteExistingVideo: z.coerce.boolean().optional(),
  updateLessonVideoUrl: z.coerce.boolean().optional(),
  syncSmartsheetVideoUrl: z.coerce.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (!value.script && (!value.slides || value.slides.length === 0) && (!value.scenes || value.scenes.length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide script, slides, or scenes for generation.",
        path: ["script"],
      });
    }
  });

const activeVideoGenerationJobs = new Set<string>();

function parseJsonObject(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function parseStringArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
  }

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean);
      }
    } catch {
      return [];
    }
  }

  return [];
}

function mapVideoGenerationJob(row: VideoGenerationJobRow) {
  const payload = parseJsonObject(row.request_payload);
  const warnings = parseStringArray(row.warnings);

  return {
    jobId: row.job_id,
    lessonId: row.lesson_id,
    sourceRowId: row.source_row_id,
    assetId: row.asset_id,
    assetContentUrl: row.asset_id ? `/api/assets/${encodeURIComponent(row.asset_id)}/content` : null,
    status: row.status,
    voiceId: row.voice_id,
    payload: {
      lessonTitle: typeof payload.lessonTitle === "string" ? payload.lessonTitle : null,
      moduleTitle: typeof payload.moduleTitle === "string" ? payload.moduleTitle : null,
      lessonCode: typeof payload.lessonCode === "string" ? payload.lessonCode : null,
      track: typeof payload.track === "string" ? payload.track : null,
      owner: typeof payload.owner === "string" ? payload.owner : null,
      runtimeSec: typeof payload.runtimeSec === "number" ? payload.runtimeSec : null,
      ttsProvider: typeof payload.ttsProvider === "string" ? payload.ttsProvider : null,
      voiceEngine: typeof payload.voiceEngine === "string" ? payload.voiceEngine : null,
      openAiModel: typeof payload.openAiModel === "string" ? payload.openAiModel : null,
      renderWidth: typeof payload.renderWidth === "number" ? payload.renderWidth : null,
      renderHeight: typeof payload.renderHeight === "number" ? payload.renderHeight : null,
      renderFps: typeof payload.renderFps === "number" ? payload.renderFps : null,
      updateLessonVideoUrl:
        typeof payload.updateLessonVideoUrl === "boolean" ? payload.updateLessonVideoUrl : null,
      syncSmartsheetVideoUrl:
        typeof payload.syncSmartsheetVideoUrl === "boolean" ? payload.syncSmartsheetVideoUrl : null,
      publishAfterGenerate:
        typeof payload.publishAfterGenerate === "boolean" ? payload.publishAfterGenerate : null,
      overwriteExistingVideo:
        typeof payload.overwriteExistingVideo === "boolean" ? payload.overwriteExistingVideo : null,
    },
    warnings,
    errorMessage: row.error_message,
    createdBy: row.created_by,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function estimateNarrationSeconds(payload: { script?: string | null; slides?: Array<{ narration: string }> | null }): number {
  if (payload.slides && payload.slides.length > 0) {
    const words = payload.slides
      .map((slide) => slide.narration.trim().split(/\s+/).filter(Boolean).length)
      .reduce((sum, value) => sum + value, 0);
    return words / 2.6;
  }

  if (payload.script) {
    const words = payload.script.trim().split(/\s+/).filter(Boolean).length;
    return words / 2.6;
  }

  return 0;
}

function queueVideoGeneration(jobId: string): void {
  if (process.env.VITEST === "true") {
    return;
  }

  if (activeVideoGenerationJobs.has(jobId)) {
    return;
  }

  activeVideoGenerationJobs.add(jobId);

  void processVideoGenerationJob(jobId).finally(() => {
    activeVideoGenerationJobs.delete(jobId);
  });
}

async function attachVideoToLessonRecord(input: {
  lessonId: string;
  videoUrl: string;
  overwriteExistingVideo: boolean;
}): Promise<{ sourceRowId: string | null }> {
  if (!input.overwriteExistingVideo) {
    const [currentLesson] = await query<{ video_url: string | null }>(
      `
        select video_url
        from content_lessons
        where lesson_id = $1
        limit 1
      `,
      [input.lessonId],
    );

    if (currentLesson?.video_url) {
      throw new Error(
        "overwriteExistingVideo=false and lesson already has a VideoUrl. Set overwriteExistingVideo=true to replace it.",
      );
    }
  }

  const [lessonRow] = await query<{ source_row_id: string | null }>(
    `
      update content_lessons
      set video_url = $2
      where lesson_id = $1
      returning source_row_id
    `,
    [input.lessonId, input.videoUrl],
  );

  return {
    sourceRowId: lessonRow?.source_row_id ?? null,
  };
}

async function processVideoGenerationJob(jobId: string): Promise<void> {
  const [job] = await query<VideoGenerationJobRow>(
    `
      update video_generation_jobs
      set status = 'processing',
          started_at = coalesce(started_at, now()),
          error_message = null
      where job_id = $1
        and status = 'queued'
      returning job_id, lesson_id, source_row_id, asset_id, status, voice_id, request_payload,
        warnings, error_message, created_by, started_at, completed_at, created_at
    `,
    [jobId],
  );

  if (!job) {
    return;
  }

  const rawPayload = parseJsonObject(job.request_payload) as Partial<VideoGenerationRequestPayload>;
  if (!rawPayload.lessonTitle || !rawPayload.moduleTitle || !rawPayload.track || !rawPayload.voiceId || !rawPayload.voiceEngine) {
    const errorMessage = "Invalid generation payload.";
    await query(
      `
        update video_generation_jobs
        set status = 'failed',
            error_message = $2,
            completed_at = now()
        where job_id = $1
      `,
      [jobId, errorMessage],
    );
    return;
  }

  const payload = rawPayload as VideoGenerationRequestPayload;
  const warnings: string[] = [];

  try {
    const generated = await generateLessonVideo({
      jobId,
      lessonTitle: payload.lessonTitle,
      moduleTitle: payload.moduleTitle,
      track: payload.track,
      owner: payload.owner ?? "AWB Academy",
      script: payload.script ?? null,
      slides: payload.slides ?? null,
      ttsProvider: payload.ttsProvider,
      voiceId: payload.voiceId,
      voiceEngine: payload.voiceEngine,
      openAiModel: payload.openAiModel,
      render: {
        width: payload.renderWidth,
        height: payload.renderHeight,
        fps: payload.renderFps,
      },
      brand: {
        logoUrl: payload.brandLogoUrl,
        primaryColor: payload.brandPrimaryColor,
        accentColor: payload.brandAccentColor,
        fontFamily: payload.brandFontFamily,
      },
      onStage: async (stage) => {
        await query(
          `
            update video_generation_jobs
            set status = $2
            where job_id = $1
          `,
          [jobId, stage],
        );
      },
    });

    warnings.push(...generated.warnings);

    await query(
      `
        update video_generation_jobs
        set status = 'uploading'
        where job_id = $1
      `,
      [jobId],
    );

    const assetId = randomUUID();
    const stored = await moveUploadToMediaStorage({
      tempPath: generated.outputPath,
      assetId,
      extension: "mp4",
    });
    const fileStats = await fs.stat(stored.absolutePath);
    const processing = await inspectMediaProcessing("video", stored.absolutePath);
    if (processing.notes) {
      warnings.push(processing.notes);
    }

    await query(
      `
        insert into media_assets (
          asset_id, title, description, media_type, mime_type, file_ext, file_size,
          storage_path, storage_name, duration_sec, page_count, processing_status,
          processing_notes, created_by
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `,
      [
        assetId,
        `${payload.lessonTitle ?? "Generated Lesson"} (Auto Generated Video)`,
        `Generated from lesson script via admin workflow. Job: ${jobId}`,
        "video" satisfies MediaType,
        "video/mp4",
        "mp4",
        fileStats.size,
        stored.relativePath,
        `${assetId}.mp4`,
        processing.durationSec,
        null,
        warnings.length > 0 ? "ready-with-warnings" : "ready",
        warnings.length > 0 ? warnings.join(" | ") : null,
        job.created_by,
      ],
    );

    const contentUrl = `/api/assets/${encodeURIComponent(assetId)}/content`;
    const shouldUpdateLesson = payload.updateLessonVideoUrl && payload.lessonId;
    const shouldSyncSmartsheet = payload.syncSmartsheetVideoUrl && payload.lessonId;
    let sourceRowId = job.source_row_id;

    if (shouldUpdateLesson) {
      const attachResult = await attachVideoToLessonRecord({
        lessonId: payload.lessonId!,
        videoUrl: contentUrl,
        overwriteExistingVideo: payload.overwriteExistingVideo,
      });
      sourceRowId = attachResult.sourceRowId ?? sourceRowId;
    }

    if (payload.publishAfterGenerate && payload.lessonId) {
      await query(
        `
          update content_lessons
          set publish_status = 'Published'
          where lesson_id = $1
        `,
        [payload.lessonId],
      );
    }

    if (shouldSyncSmartsheet) {
      if (!sourceRowId) {
        warnings.push("Lesson has no source Smartsheet row id. VideoUrl was updated only in local catalog.");
      } else if (!isSmartsheetConfigured()) {
        warnings.push("Smartsheet is not configured. VideoUrl was updated only in local catalog.");
      } else {
        try {
          const updates: Record<string, string> = {
            VideoUrl: contentUrl,
          };
          if (payload.publishAfterGenerate) {
            updates.PublishStatus = "Published";
          }
          await updateRowByColumnTitle(smartsheetIds.catalog, sourceRowId, {
            ...updates,
          });
        } catch (error) {
          const syncWarning = error instanceof Error ? error.message : "Smartsheet VideoUrl update failed.";
          warnings.push(syncWarning);
          await recordSyncRun("admin.video-generation", "warning", {
            jobId,
            lessonId: payload.lessonId,
            sourceRowId,
            error: syncWarning,
          });
        }
      }
    }

    await query(
      `
        update video_generation_jobs
        set status = 'completed',
            asset_id = $2,
            warnings = $3::jsonb,
            error_message = null,
            completed_at = now()
        where job_id = $1
      `,
      [jobId, assetId, JSON.stringify(warnings)],
    );

    await insertAuditLog({
      actor: job.created_by,
      role: "admin",
      action: "admin.video-generation.completed",
      entityType: "video_generation_job",
      entityId: jobId,
      details: {
        assetId,
        lessonId: payload.lessonId,
        warningCount: warnings.length,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Video generation failed.";

    await query(
      `
        update video_generation_jobs
        set status = 'failed',
            error_message = $2,
            completed_at = now()
        where job_id = $1
      `,
      [jobId, errorMessage],
    );

    await insertAuditLog({
      actor: job.created_by,
      role: "admin",
      action: "admin.video-generation.failed",
      entityType: "video_generation_job",
      entityId: jobId,
      details: {
        lessonId: payload.lessonId,
        error: errorMessage,
      },
    });
  } finally {
    await cleanupGeneratedLessonArtifacts(jobId);
  }
}

app.get(["/health", "/api/health"], async (_req, res) => {
  const [latestSync] = await query<{ created_at: string; status: string }>(
    `select created_at, status from sync_runs order by created_at desc limit 1`,
  );
  const smartsheet = await getSmartsheetHealthReport();
  const status = smartsheet.ok ? "ok" : "degraded";
  const smartsheetDependency = smartsheet.required
    ? (smartsheet.ok ? "ok" : "degraded")
    : "disabled";

  res.json({
    status,
    ok: status === "ok",
    service: "api",
    version: apiEnv.APP_VERSION,
    dependencies: {
      smartsheet: smartsheetDependency,
    },
    latestSync: latestSync
      ? {
          createdAt: latestSync.created_at,
          status: latestSync.status,
        }
      : null,
    timestamp: new Date().toISOString(),
  });
});

app.get(
  ["/modules/audit-ready-wound-documentation", "/api/modules/audit-ready-wound-documentation"],
  (_req, res) => {
    res.json({
      moduleId: "CORE-2",
      title: "Audit-Ready Wound Documentation",
      subtitle: "Clinical note structure that is defensible for audit and escalation.",
      totalDurationMinutes: 32,
      lessons: [
        {
          lessonId: "CORE-2-L1",
          title: "Why Wound Care Claims Fail",
          durationMinutes: 8,
          objective: "Identify the most common denial drivers and missing note elements.",
        },
        {
          lessonId: "CORE-2-L2",
          title: "The Medicare-Defensible Note Structure",
          durationMinutes: 8,
          objective: "Apply the 8-section note structure consistently.",
        },
        {
          lessonId: "CORE-2-L3",
          title: "Procedure + Debridement Documentation",
          durationMinutes: 8,
          objective: "Document billable debridement with required operative elements.",
        },
        {
          lessonId: "CORE-2-L4",
          title: "Automated Audit Defense Checklist",
          durationMinutes: 8,
          objective: "Use automated scoring before claim submission.",
        },
      ],
      quiz: [
        {
          question: "Which element is required for a billable debridement note?",
          options: [
            "Instrumentation only",
            "Tissue removal documentation",
            "Anesthesia plan only",
            "Antibiotic order",
          ],
          answer: "Tissue removal documentation",
        },
        {
          question: "If a wound does not improve after 30 days, what is required?",
          options: [
            "Continue the same plan without changes",
            "Reassess underlying causes and adjust treatment",
            "Stop measurement documentation",
            "Add codes without reassessment",
          ],
          answer: "Reassess underlying causes and adjust treatment",
        },
      ],
    });
  },
);

const auditReadyNoteSchema = z.object({
  diagnosis: z.string().trim().optional(),
  location: z.string().trim().optional(),
  lengthCm: z.coerce.number().positive().optional(),
  widthCm: z.coerce.number().positive().optional(),
  depthCm: z.coerce.number().positive().optional(),
  necroticTissue: z.string().trim().optional(),
  procedure: z.string().trim().optional(),
  tissueRemoved: z.string().trim().optional(),
  postProcedureStatus: z.string().trim().optional(),
  followUpPlan: z.string().trim().optional(),
});

app.post(["/tools/wound-audit/score", "/api/tools/wound-audit/score"], (req, res) => {
  const parseResult = auditReadyNoteSchema.safeParse(req.body ?? {});

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const result = scoreAuditReadyWoundNote(parseResult.data);
  res.json(result);
});

app.post(["/tools/wound-audit/generate", "/api/tools/wound-audit/generate"], (req, res) => {
  const parseResult = auditReadyNoteSchema.safeParse(req.body ?? {});

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  res.json({
    note: generateAuditReadyWoundNote(parseResult.data),
    score: scoreAuditReadyWoundNote(parseResult.data),
  });
});

app.get(
  ["/modules/debridement-documentation-mastery", "/api/modules/debridement-documentation-mastery"],
  (_req, res) => {
    res.json({
      moduleId: "CORE-3",
      title: "Debridement Documentation Mastery",
      subtitle: "Clear debridement documentation with coding-ready note structure.",
      totalDurationMinutes: 24,
      lessons: [
        {
          lessonId: "CORE-3-L1",
          title: "Debridement Types + Medicare Rules",
          durationMinutes: 8,
          objective: "Differentiate selective, non-selective, and surgical debridement documentation requirements.",
        },
        {
          lessonId: "CORE-3-L2",
          title: "The Coding-Ready Debridement Note",
          durationMinutes: 8,
          objective: "Document depth and surface area so CPT selection is defensible.",
        },
        {
          lessonId: "CORE-3-L3",
          title: "Audit-Proof Debridement Documentation",
          durationMinutes: 8,
          objective: "Reduce denials with complete operative note elements and trend evidence.",
        },
      ],
      quiz: [
        {
          question: "The CPT debridement code is primarily determined by:",
          options: ["Anesthesia", "Wound location", "Tissue depth removed", "Dressing type"],
          answer: "Tissue depth removed",
        },
        {
          question: "Which element is mandatory in a debridement note?",
          options: ["Tissue removed", "Antibiotic order", "Imaging report", "Anesthesia level"],
          answer: "Tissue removed",
        },
      ],
    });
  },
);

const debridementNoteSchema = z.object({
  diagnosis: z.string().trim().optional(),
  woundLocation: z.string().trim().optional(),
  lengthCm: z.coerce.number().positive().optional(),
  widthCm: z.coerce.number().positive().optional(),
  depthCm: z.coerce.number().positive().optional(),
  tissuePresent: z.string().trim().optional(),
  procedureMethod: z.string().trim().optional(),
  tissueRemoved: z.string().trim().optional(),
  depthRemoved: z.string().trim().optional(),
  surfaceAreaSqCm: z.coerce.number().positive().optional(),
  hemostasis: z.string().trim().optional(),
  postProcedureStatus: z.string().trim().optional(),
  followUpPlan: z.string().trim().optional(),
});

app.post(["/tools/debridement/score", "/api/tools/debridement/score"], (req, res) => {
  const parseResult = debridementNoteSchema.safeParse(req.body ?? {});

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  res.json({
    ...scoreDebridementDocumentation(parseResult.data),
    suggestedCpt: suggestDebridementCptCode(parseResult.data),
  });
});

app.post(["/tools/debridement/generate", "/api/tools/debridement/generate"], (req, res) => {
  const parseResult = debridementNoteSchema.safeParse(req.body ?? {});

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  res.json({
    note: generateDebridementNote(parseResult.data),
    score: scoreDebridementDocumentation(parseResult.data),
    suggestedCpt: suggestDebridementCptCode(parseResult.data),
  });
});

app.get(
  ["/modules/escalation-advanced-modalities", "/api/modules/escalation-advanced-modalities"],
  (_req, res) => {
    res.json({
      moduleId: "CORE-4",
      title: "Escalation to Advanced Modalities + Grafting / CTP",
      subtitle: "Escalation logic tied to standard care and objective trends.",
      totalDurationMinutes: 24,
      lessons: [
        {
          lessonId: "CORE-4-L1",
          title: "When Standard Care Fails",
          durationMinutes: 8,
          objective: "Recognize objective healing failure and escalation triggers.",
        },
        {
          lessonId: "CORE-4-L2",
          title: "Advanced Modalities",
          durationMinutes: 8,
          objective: "Use objective data to choose advanced therapy at the right time.",
        },
        {
          lessonId: "CORE-4-L3",
          title: "Grafting and CTP Decision Logic",
          durationMinutes: 8,
          objective: "Apply CTP eligibility thresholds and stop-rules with defensible documentation.",
        },
      ],
      quiz: [
        {
          question: "Escalation should occur when:",
          options: [
            "Improvement continues",
            "Infection is resolved but trend is improving",
            "Healing plateaus after standard care",
            "Patient requests grafting",
          ],
          answer: "Healing plateaus after standard care",
        },
        {
          question: "CTP should only be used after:",
          options: [
            "One week of treatment",
            "Failure of documented standard care",
            "Patient preference",
            "Nursing recommendation alone",
          ],
          answer: "Failure of documented standard care",
        },
      ],
    });
  },
);

const escalationSchema = z.object({
  weeksOfTreatment: z.coerce.number().min(0).max(52).optional(),
  percentAreaReduction: z.coerce.number().min(-100).max(100).optional(),
  initialAreaSqCm: z.coerce.number().positive().optional(),
  currentAreaSqCm: z.coerce.number().positive().optional(),
  infectionPresent: z.coerce.boolean().optional(),
  necroticTissuePresent: z.coerce.boolean().optional(),
  standardCareCompleted: z.coerce.boolean().optional(),
});

app.post(["/tools/escalation/evaluate", "/api/tools/escalation/evaluate"], (req, res) => {
  const parseResult = escalationSchema.safeParse(req.body ?? {});

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;
  const percentAreaReduction =
    typeof payload.percentAreaReduction === "number"
      ? payload.percentAreaReduction
      : typeof payload.initialAreaSqCm === "number" && typeof payload.currentAreaSqCm === "number"
        ? calculateWoundAreaReduction(payload.initialAreaSqCm, payload.currentAreaSqCm)
        : 0;

  const evaluation = evaluateEscalation({
    weeksOfTreatment: payload.weeksOfTreatment,
    percentAreaReduction,
    infectionPresent: payload.infectionPresent,
    necroticTissuePresent: payload.necroticTissuePresent,
    standardCareCompleted: payload.standardCareCompleted,
  });

  res.json({
    percentAreaReduction,
    recommendationCode: evaluation.recommendationCode,
    recommendation: evaluation.recommendation,
    graftRecommendation: evaluation.graftRecommendation,
    rationale: evaluation.rationale,
  });
});

app.get(["/assets", "/api/assets"], async (req, res) => {
  const schema = z.object({
    type: z.enum(["video", "audio", "pdf"]).optional(),
    limit: z.coerce.number().int().positive().max(200).default(100),
  });
  const parseResult = schema.safeParse(req.query);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;
  const rows = await query<MediaAssetRow>(
    `
      select asset_id, title, description, media_type, mime_type, file_ext, file_size::text,
        storage_name, storage_path, duration_sec, page_count, processing_status, processing_notes,
        created_by, created_at
      from media_assets
      where ($1::text is null or media_type = $1)
      order by created_at desc
      limit $2
    `,
    [payload.type ?? null, payload.limit],
  );

  res.json({
    assets: rows.map(mapMediaAsset),
  });
});

app.get(["/assets/:assetId", "/api/assets/:assetId"], async (req, res) => {
  const assetId = getRouteParam(req.params.assetId);
  const [row] = await query<MediaAssetRow>(
    `
      select asset_id, title, description, media_type, mime_type, file_ext, file_size::text,
        storage_name, storage_path, duration_sec, page_count, processing_status, processing_notes,
        created_by, created_at
      from media_assets
      where asset_id = $1
      limit 1
    `,
    [assetId],
  );

  if (!row) {
    res.status(404).json({ error: "Asset not found." });
    return;
  }

  res.json(mapMediaAsset(row));
});

app.get(["/assets/:assetId/content", "/api/assets/:assetId/content"], async (req, res) => {
  const assetId = getRouteParam(req.params.assetId);
  const [row] = await query<Pick<MediaAssetRow, "asset_id" | "mime_type" | "storage_name" | "storage_path">>(
    `
      select asset_id, mime_type, storage_name, storage_path
      from media_assets
      where asset_id = $1
      limit 1
    `,
    [assetId],
  );

  if (!row) {
    res.status(404).json({ error: "Asset not found." });
    return;
  }

  let absolutePath: string;
  try {
    absolutePath = resolveStoredMediaPath(row.storage_path);
  } catch {
    res.status(500).json({ error: "Stored asset path is invalid." });
    return;
  }

  let stats;
  try {
    stats = await fs.stat(absolutePath);
  } catch {
    res.status(404).json({ error: "Stored asset file not found." });
    return;
  }

  const fileSize = stats.size;
  const rangeHeader = req.headers.range;
  const shouldDownload = req.query.download === "1" || req.query.download === "true";
  const disposition = shouldDownload ? "attachment" : "inline";
  const fileName = safeFileName(row.storage_name);

  res.setHeader("Accept-Ranges", "bytes");
  const responseMimeType =
    row.mime_type && row.mime_type !== "application/octet-stream"
      ? row.mime_type
      : (inferMimeTypeFromFileName(row.storage_name) ?? "application/octet-stream");
  res.setHeader("Content-Type", responseMimeType);
  res.setHeader("Content-Disposition", `${disposition}; filename="${fileName}"`);

  if (rangeHeader) {
    const parsedRange = parseByteRange(rangeHeader, fileSize);

    if (!parsedRange) {
      res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
      res.end();
      return;
    }

    const chunkSize = parsedRange.end - parsedRange.start + 1;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${parsedRange.start}-${parsedRange.end}/${fileSize}`);
    res.setHeader("Content-Length", String(chunkSize));
    createReadStream(absolutePath, {
      start: parsedRange.start,
      end: parsedRange.end,
    }).pipe(res);
    return;
  }

  res.setHeader("Content-Length", String(fileSize));
  createReadStream(absolutePath).pipe(res);
});

app.get(["/program/catalog", "/api/program/catalog"], (_req, res) => {
  res.json(PROGRAM_CATALOG);
});

app.get(["/lcd-updates", "/api/lcd-updates"], (_req, res) => {
  res.json({
    updates: PROGRAM_CATALOG.lcdUpdateLog,
    strategy: PROGRAM_CATALOG.latestLcdHandling,
  });
});

app.get(["/experiments/catalog-hero/config", "/api/experiments/catalog-hero/config"], (_req, res) => {
  res.json(buildHeroExperimentConfig());
});

app.post(["/experiments/events", "/api/experiments/events"], async (req, res) => {
  const parseResult = experimentEventSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;

  if (payload.experimentId !== HERO_EXPERIMENT.id) {
    res.status(404).json({ error: "Experiment not found." });
    return;
  }

  const variant = resolveHeroExperimentVariant(payload.variantId);

  if (!variant) {
    res.status(400).json({ error: "Variant is not valid for this experiment." });
    return;
  }

  const eventId = randomUUID();

  await query(
    `
      insert into experiment_events (
        event_id, experiment_id, variant_id, event_type, session_key, user_id, path, metadata
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      eventId,
      payload.experimentId,
      payload.variantId,
      payload.eventType,
      payload.sessionKey,
      payload.userId ?? null,
      payload.path ?? null,
      payload.metadata ?? {},
    ],
  );

  res.status(202).json({
    accepted: true,
    eventId,
    experimentId: payload.experimentId,
    variantId: payload.variantId,
    eventType: payload.eventType,
  });
});

app.get(["/catalog", "/api/catalog"], async (req, res) => {
  const track = typeof req.query.track === "string" ? req.query.track : undefined;
  const [tracks, lessons] = await Promise.all([listTracks(), listLessonsByTrack(track)]);

  res.json({
    tracks,
    lessons,
  });
});

app.get(["/progress/path", "/api/progress/path"], async (req, res) => {
  const schema = z.object({
    userId: z.string().min(1),
    track: z.string().min(1),
  });
  const parseResult = schema.safeParse(req.query);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;
  const trackMeta = resolveTrackMeta(payload.track);

  if (!trackMeta) {
    res.status(404).json({ error: "Track not found." });
    return;
  }

  res.json(await buildTrackPathProgress(payload.userId, payload.track, trackMeta));
});

app.get(["/lessons/:lessonId", "/api/lessons/:lessonId"], async (req, res) => {
  const lesson = await getLesson(getRouteParam(req.params.lessonId));

  if (!lesson) {
    res.status(404).json({ error: "Lesson not found." });
    return;
  }

  res.json(lesson);
});

app.get(["/completion/:userId", "/api/completion/:userId"], async (req, res) => {
  const userId = getRouteParam(req.params.userId);
  const attempts = await query(
    `
      select attempt_id, track, module_id, attempt_number, score, pass_fail, completed_at, certificate_id
      from quiz_attempts
      where user_id = $1
      order by completed_at desc
    `,
    [userId],
  );

  res.json({
    userId,
    attempts,
  });
});

app.post(["/progress/lessons", "/api/progress/lessons"], async (req, res) => {
  const schema = z.object({
    userId: z.string().min(1),
    trackId: z.string().min(1),
    lessonId: z.string().min(1),
    watchedSeconds: z.coerce.number().int().nonnegative(),
    totalSeconds: z.coerce.number().int().positive(),
  });
  const parseResult = schema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;
  const completed = payload.watchedSeconds / payload.totalSeconds >= VIDEO_COMPLETION_THRESHOLD;

  await query(
    `
      insert into lesson_progress (
        progress_id, user_id, track_id, lesson_id, watched_seconds, total_seconds, completed, completed_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      on conflict (user_id, lesson_id)
      do update set
        watched_seconds = excluded.watched_seconds,
        total_seconds = excluded.total_seconds,
        completed = excluded.completed,
        completed_at = excluded.completed_at,
        track_id = excluded.track_id
    `,
    [
      randomUUID(),
      payload.userId,
      payload.trackId,
      payload.lessonId,
      payload.watchedSeconds,
      payload.totalSeconds,
      completed,
      completed ? new Date().toISOString() : null,
    ],
  );

  res.status(201).json({
    lessonId: payload.lessonId,
    completed,
    threshold: VIDEO_COMPLETION_THRESHOLD,
  });
});

app.post(["/assignments/practical", "/api/assignments/practical"], async (req, res) => {
  const schema = z.object({
    userId: z.string().min(1),
    trackId: z.literal("providers"),
    submissionType: z.string().default("documentation-practical"),
    rubricScore: z.coerce.number().int().min(0).max(100),
  });
  const parseResult = schema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;
  const assignmentId = randomUUID();

  await query(
    `
      insert into practical_assignments (
        assignment_id, user_id, track_id, submission_type, rubric_score, status
      )
      values ($1, $2, $3, $4, $5, $6)
    `,
    [
      assignmentId,
      payload.userId,
      payload.trackId,
      payload.submissionType,
      payload.rubricScore,
      payload.rubricScore >= 80 ? "passed" : "review-needed",
    ],
  );

  res.status(201).json({
    assignmentId,
    passed: payload.rubricScore >= 80,
  });
});

app.get(["/quiz", "/api/quiz"], async (req, res) => {
  const schema = z.object({
    track: z.string().min(1),
    moduleId: z.string().min(1),
    userId: z.string().min(1).optional(),
    n: z.coerce.number().int().positive().max(50).optional(),
  });

  const parseResult = schema.safeParse(req.query);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const { track, moduleId, n, userId } = parseResult.data;
  const isFinalExam = moduleId.toUpperCase() === "FINAL";
  const trackMeta = resolveTrackMeta(track);
  const targetQuestionCount =
    n ?? (isFinalExam ? (trackMeta?.finalExamQuestions ?? 30) : 10);

  if (userId) {
    if (!trackMeta) {
      res.status(404).json({ error: "Track not found." });
      return;
    }

    const path = await buildTrackPathProgress(userId, track, trackMeta);

    if (isFinalExam) {
      if (!path.finalExam.unlocked) {
        res.status(403).json({ error: path.finalExam.reason });
        return;
      }
    } else {
      const module = path.modules.find((entry) => entry.moduleId === moduleId);

      if (!module) {
        res.status(404).json({ error: "Module is not part of this track path." });
        return;
      }

      if (!module.unlocked || !module.quizUnlocked) {
        res.status(403).json({ error: module.quizLockedReason ?? "Module quiz is locked." });
        return;
      }
    }
  }

  const questions = await query<{
    id: string;
    difficulty: number;
    question_type: string;
    stem: string;
    options: Array<{ key: string; value: string }>;
    rationale: string | null;
    tags: string[];
  }>(
    `
      select id::text, difficulty, question_type, stem, options, rationale, tags
      from question_bank
      where track = $1
        and (
          ($2::boolean = true and (module_id = 'FINAL' or tags ? 'FINAL' or tags ? 'final'))
          or ($2::boolean = false and module_id = $3)
        )
        and active = true
    `,
    [track, isFinalExam, moduleId],
  );

  if (questions.length === 0) {
    res.status(404).json({ error: "No active questions found for that module." });
    return;
  }

  const selected = buildQuiz(
    questions.map((question) => ({
      id: question.id,
      difficulty: question.difficulty,
      correctAnswer: "N/A",
    })),
    Math.min(targetQuestionCount, questions.length),
  );
  const selectedIds = new Set(selected.map((question) => question.id));

  res.json({
    track,
    moduleId,
    isFinalExam,
    passingScore: PASSING_SCORE,
    questions: questions.filter((question) => selectedIds.has(question.id)),
  });
});

app.get(["/quiz/config", "/api/quiz/config"], (_req, res) => {
  res.json({
    passingScore: PASSING_SCORE,
    videoCompletionThreshold: VIDEO_COMPLETION_THRESHOLD,
    tracks: PROGRAM_TRACKS.map((track) => ({
      id: track.id,
      title: track.title,
      moduleCount: track.moduleCount,
      finalExamQuestions: track.finalExamQuestions,
      passScore: track.passScore,
    })),
  });
});

app.post(["/quiz/submit", "/api/quiz/submit"], async (req, res) => {
  const schema = z.object({
    userId: z.string().min(1),
    learnerFullName: z.string().min(1).optional(),
    learnerEmail: z.string().email().optional(),
    track: z.string().min(1),
    moduleId: z.string().min(1),
    timeSpentSec: z.coerce.number().int().nonnegative().default(0),
    isFinalExam: z.boolean().optional(),
    answers: z.array(
      z.object({
        questionId: z.string().min(1),
        selected: z.array(z.string().min(1)).default([]),
      }),
    ),
  });

  const parseResult = schema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;
  const trackMeta = resolveTrackMeta(payload.track);
  const isFinalExam = payload.isFinalExam ?? payload.moduleId.toLowerCase().includes("final");
  const path = trackMeta
    ? await buildTrackPathProgress(payload.userId, payload.track, trackMeta)
    : null;

  if (path) {
    if (isFinalExam && !path.finalExam.unlocked) {
      res.status(403).json({ error: path.finalExam.reason });
      return;
    }

    if (!isFinalExam) {
      const module = path.modules.find((entry) => entry.moduleId === payload.moduleId);

      if (!module) {
        res.status(404).json({ error: "Module is not part of this track path." });
        return;
      }

      if (!module.unlocked || !module.quizUnlocked) {
        res.status(403).json({ error: module.quizLockedReason ?? "Module quiz is locked." });
        return;
      }
    }
  }

  const questionIds = payload.answers.map((answer) => answer.questionId);
  const questions = await query<{
    id: string;
    difficulty: number;
    correct_answer: string;
    stem: string;
  }>(
    `
      select id::text, difficulty, correct_answer, stem
      from question_bank
      where track = $1
        and id::text = any($3::text[])
        and (
          ($4::boolean = true and (module_id = 'FINAL' or tags ? 'FINAL' or tags ? 'final'))
          or ($4::boolean = false and module_id = $2)
        )
    `,
    [payload.track, payload.moduleId, questionIds, isFinalExam],
  );

  if (questions.length === 0) {
    res.status(404).json({ error: "Questions not found for submission." });
    return;
  }

  const grade = gradeQuiz(
    questions.map((question) => ({
      id: question.id,
      difficulty: question.difficulty,
      correctAnswer: question.correct_answer,
    })),
    payload.answers as QuizSubmissionAnswer[],
  );

  const [{ count }] = await query<{ count: string }>(
    `
      select count(*)::text as count
      from quiz_attempts
      where user_id = $1 and track = $2 and module_id = $3
    `,
    [payload.userId, payload.track, payload.moduleId],
  );

  const attemptId = randomUUID();
  const attemptNumber = Number(count) + 1;
  const completedAt = new Date().toISOString();
  const shouldIssueCertificate = grade.pass && isFinalExam;
  const certificateId = shouldIssueCertificate
    ? generateCertificateId(normalizeTrackKey(payload.track))
    : null;
  const courseTitle = trackMeta?.certificateTitle ?? payload.track;
  const learnerFullName = payload.learnerFullName ?? payload.userId;
  const courseTrack = trackMeta?.title ?? payload.track;

  await query(
    `
      insert into quiz_attempts (
        attempt_id, user_id, track, track_id, module_id, attempt_number, score, pass_fail,
        time_spent_sec, completed_at, question_count, correct_count, answers, certificate_id
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14)
    `,
    [
      attemptId,
      payload.userId,
      payload.track,
      trackMeta?.id ?? null,
      payload.moduleId,
      attemptNumber,
      grade.score,
      grade.pass,
      payload.timeSpentSec,
      completedAt,
      grade.totalQuestions,
      grade.correctAnswers,
      JSON.stringify(payload.answers),
      certificateId,
    ],
  );

  if (certificateId) {
    await query(
      `
        insert into certificates (
          id, certificate_id, user_id, learner_full_name, learner_email, track, course_track, track_id,
          course_title, completion_date, module_id, attempt_id, score, score_final_exam, status, issued_at, created_by
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'valid', $15, $16)
      `,
      [
        randomUUID(),
        certificateId,
        payload.userId,
        learnerFullName,
        payload.learnerEmail ?? null,
        payload.track,
        courseTrack,
        trackMeta?.id ?? null,
        courseTitle,
        completedAt.slice(0, 10),
        payload.moduleId,
        attemptId,
        grade.score,
        grade.score,
        completedAt,
        "system",
      ],
    );
  }

  let smartsheetSynced = true;

  try {
    await addRowByColumnTitle(smartsheetIds.results, {
      UserId: payload.userId,
      Track: payload.track,
      ModuleId: payload.moduleId,
      Attempt: attemptNumber,
      Score: grade.score,
      PassFail: grade.pass ? "Pass" : "Fail",
      TimeSpentSec: payload.timeSpentSec,
      CompletedAt: completedAt,
      CertificateId: certificateId ?? "",
    });
  } catch (error) {
    smartsheetSynced = false;
    await recordSyncRun("quiz-submit", "warning", {
      attemptId,
      error: error instanceof Error ? error.message : "Unknown Smartsheet error",
    });
  }

  res.status(201).json({
    attemptId,
    attemptNumber,
    score: grade.score,
    pass: grade.pass,
    correctAnswers: grade.correctAnswers,
    totalQuestions: grade.totalQuestions,
    certificateId,
    smartsheetSynced,
  });
});

app.get("/api/verify/:certificateId", async (req, res) => {
  const certificateId = getRouteParam(req.params.certificateId);
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

  if (!enforceVerifyRateLimit(ipAddress)) {
    res.status(429).json({
      valid: false,
      reason: "Too many verification requests. Please try again later.",
    });
    return;
  }

  const [certificate] = await query<{
    certificate_id: string;
    user_id: string;
    learner_full_name: string | null;
    learner_email: string | null;
    track: string;
    course_track: string | null;
    track_id: string | null;
    course_title: string | null;
    completion_date: string | null;
    module_id: string;
    score: number;
    score_final_exam: number | null;
    status: string;
    issued_at: string;
    revoked_at: string | null;
    revoked_reason: string | null;
    pdf_url: string | null;
  }>(
    `
      select certificate_id, user_id, learner_full_name, learner_email, track, course_track, module_id,
        score, score_final_exam, status, issued_at, completion_date, revoked_at, revoked_reason, pdf_url,
        track_id, course_title
      from certificates
      where certificate_id = $1
      limit 1
    `,
    [certificateId],
  );

  if (!certificate) {
    res.status(404).json({
      valid: false,
      reason: "Certificate not found.",
    });
    return;
  }

  await insertVerificationLookup({
    certificateId: certificate.certificate_id,
    ipAddress,
    userAgent: req.get("user-agent") ?? null,
  });

  const masked = req.query.unmasked !== "true";

  res.json(
    await buildCertificatePresentation({
      certificateId: certificate.certificate_id,
      learnerFullName: getDisplayLearnerName(
        certificate.learner_full_name ?? certificate.user_id,
        masked,
      ),
      trackId: certificate.track_id,
      track: certificate.course_track ?? certificate.track,
      moduleId: certificate.module_id,
      userId: certificate.user_id,
      score: certificate.score_final_exam ?? certificate.score,
      status: certificate.status,
      issuedAt: certificate.issued_at,
      completionDate: certificate.completion_date ?? certificate.issued_at.slice(0, 10),
      courseTitle: certificate.course_title,
      pdfUrl: certificate.pdf_url,
    }),
  );
});

app.get("/api/certificates/:certificateId/html", async (req, res) => {
  const certificateId = getRouteParam(req.params.certificateId);
  const [certificate] = await query<{
    certificate_id: string;
    user_id: string;
    learner_full_name: string | null;
    track: string;
    course_track: string | null;
    track_id: string | null;
    course_title: string | null;
    completion_date: string | null;
    module_id: string;
    score: number;
    score_final_exam: number | null;
    status: string;
    issued_at: string;
    pdf_url: string | null;
  }>(
    `
      select certificate_id, user_id, learner_full_name, track, course_track, module_id, score,
        score_final_exam, status, issued_at, completion_date, pdf_url, track_id, course_title
      from certificates
      where certificate_id = $1
      limit 1
    `,
    [certificateId],
  );

  if (!certificate) {
    res.status(404).json({ error: "Certificate not found." });
    return;
  }

  const presentation = await buildCertificatePresentation({
    certificateId: certificate.certificate_id,
    learnerFullName: certificate.learner_full_name ?? certificate.user_id,
    trackId: certificate.track_id,
    track: certificate.course_track ?? certificate.track,
    moduleId: certificate.module_id,
    userId: certificate.user_id,
    score: certificate.score_final_exam ?? certificate.score,
    status: certificate.status,
    issuedAt: certificate.issued_at,
    completionDate: certificate.completion_date ?? certificate.issued_at.slice(0, 10),
    courseTitle: certificate.course_title,
    pdfUrl: certificate.pdf_url,
  });
  const defaults = resolveCertificateTemplateDefaults(
    certificate.track_id,
    certificate.course_track ?? certificate.track,
  );
  const learnerFullName =
    typeof req.query.learnerName === "string" && req.query.learnerName.trim().length > 0
      ? req.query.learnerName.trim()
      : certificate.learner_full_name ?? certificate.user_id;
  const instructorName =
    typeof req.query.instructorName === "string" && req.query.instructorName.trim().length > 0
      ? req.query.instructorName.trim()
      : defaults.instructorName;
  const creditHours =
    typeof req.query.creditHours === "string" && req.query.creditHours.trim().length > 0
      ? req.query.creditHours.trim()
      : defaults.creditHours;

  const html = buildCertificateHtml({
    learnerFullName,
    courseTrack: defaults.courseTrack,
    courseTitle: presentation.certificate.course_title,
    completionDate: new Date(
      certificate.completion_date ?? certificate.issued_at,
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    creditHours,
    certificateId: certificate.certificate_id,
    verificationUrl: presentation.certificate.verification_url,
    issuerName: defaults.issuerName,
    issuerLogoUrl: defaults.issuerLogoUrl,
    instructorName,
    qrCodeImageUrl: presentation.certificate.qr_data_url,
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

app.get("/api/certificates/:certificateId/pdf", async (req, res) => {
  const certificateId = getRouteParam(req.params.certificateId);
  if (!canAccessCertificatePdf(req.get("authorization") ?? undefined, typeof req.query.token === "string" ? req.query.token : undefined)) {
    res.status(401).json({ error: "PDF access requires an admin token or certificate PDF token." });
    return;
  }

  const [certificate] = await query<{
    certificate_id: string;
    user_id: string;
    learner_full_name: string | null;
    track: string;
    course_track: string | null;
    track_id: string | null;
    course_title: string | null;
    completion_date: string | null;
    module_id: string;
    score: number;
    score_final_exam: number | null;
    status: string;
    issued_at: string;
    pdf_url: string | null;
    pdf_storage_url: string | null;
  }>(
    `
      select certificate_id, user_id, learner_full_name, track, course_track, track_id, course_title,
        completion_date, module_id, score, score_final_exam, status, issued_at, pdf_url, pdf_storage_url
      from certificates
      where certificate_id = $1
      limit 1
    `,
    [certificateId],
  );

  if (!certificate) {
    res.status(404).json({ error: "Certificate not found." });
    return;
  }

  const presentation = await buildCertificatePresentation({
    certificateId: certificate.certificate_id,
    learnerFullName: certificate.learner_full_name ?? certificate.user_id,
    trackId: certificate.track_id,
    track: certificate.course_track ?? certificate.track,
    moduleId: certificate.module_id,
    userId: certificate.user_id,
    score: certificate.score_final_exam ?? certificate.score,
    status: certificate.status,
    issuedAt: certificate.issued_at,
    completionDate: certificate.completion_date ?? certificate.issued_at.slice(0, 10),
    courseTitle: certificate.course_title,
    pdfUrl: certificate.pdf_url,
  });
  const defaults = resolveCertificateTemplateDefaults(
    certificate.track_id,
    certificate.course_track ?? certificate.track,
  );
  const learnerFullName =
    typeof req.query.learnerName === "string" && req.query.learnerName.trim().length > 0
      ? req.query.learnerName.trim()
      : certificate.learner_full_name ?? certificate.user_id;
  const instructorName =
    typeof req.query.instructorName === "string" && req.query.instructorName.trim().length > 0
      ? req.query.instructorName.trim()
      : defaults.instructorName;
  const creditHours =
    typeof req.query.creditHours === "string" && req.query.creditHours.trim().length > 0
      ? req.query.creditHours.trim()
      : defaults.creditHours;
  const html = buildCertificateHtml({
    learnerFullName,
    courseTrack: defaults.courseTrack,
    courseTitle: presentation.certificate.course_title,
    completionDate: new Date(
      certificate.completion_date ?? certificate.issued_at,
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    creditHours,
    certificateId: certificate.certificate_id,
    verificationUrl: presentation.certificate.verification_url,
    issuerName: defaults.issuerName,
    issuerLogoUrl: defaults.issuerLogoUrl,
    instructorName,
    qrCodeImageUrl: presentation.certificate.qr_data_url,
  });

  try {
    const pdfBuffer = await renderPdfFromHtml(html);
    const pdfStorageUrl = await uploadCertificatePdf({
      certificateId,
      pdfBuffer,
    });
    const publicPdfUrl = `${apiEnv.BASE_URL.replace(/\/$/, "")}/api/certificates/${encodeURIComponent(certificateId)}/pdf`;

    await query(
      `
        update certificates
        set pdf_url = $2,
            pdf_storage_url = $3
        where certificate_id = $1
      `,
      [
        certificateId,
        publicPdfUrl,
        pdfStorageUrl,
      ],
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${certificateId}.pdf"`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    res.status(501).json({
      error: error instanceof Error ? error.message : "PDF generation is not available.",
    });
  }
});

app.post("/api/certificates", requireAdmin, async (req, res) => {
  const schema = z.object({
    learnerFullName: z.string().min(1),
    learnerEmail: z.string().email().optional(),
    courseTrackId: z.enum([
      "providers",
      "sales-marketers",
      "distributors",
      "post-acute-senior-care",
      "asc-ortho",
    ]),
    moduleId: z.string().min(1),
    completionDate: z.string().date(),
    scoreFinalExam: z.coerce.number().int().min(0).max(100),
    createdBy: z.string().optional(),
  });
  const parseResult = schema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const admin = getAdminIdentity(req);
  const payload = parseResult.data;
  const trackMeta = PROGRAM_TRACKS.find((track) => track.id === payload.courseTrackId)!;
  const certificateId = generateCertificateId(trackMeta.id, new Date(payload.completionDate));
  const issuedAt = new Date(`${payload.completionDate}T12:00:00.000Z`).toISOString();
  const attemptId = randomUUID();

  await query(
    `
      insert into quiz_attempts (
        attempt_id, user_id, track, track_id, module_id, attempt_number, score, pass_fail,
        time_spent_sec, completed_at, question_count, correct_count, answers, certificate_id
      )
      values ($1, $2, $3, $4, $5, 1, $6, true, 0, $7, 0, 0, '[]'::jsonb, $8)
    `,
    [
      attemptId,
      payload.learnerFullName,
      trackMeta.title,
      trackMeta.id,
      payload.moduleId,
      payload.scoreFinalExam,
      issuedAt,
      certificateId,
    ],
  );

  await query(
    `
      insert into certificates (
        id, certificate_id, user_id, learner_full_name, learner_email, track, course_track, track_id,
        course_title, completion_date, module_id, attempt_id, score, score_final_exam, status, issued_at, created_by
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'valid', $15, $16)
    `,
    [
      randomUUID(),
      certificateId,
      payload.learnerFullName,
      payload.learnerFullName,
      payload.learnerEmail ?? null,
      trackMeta.title,
      trackMeta.title,
      trackMeta.id,
      trackMeta.certificateTitle,
      payload.completionDate,
      payload.moduleId,
      attemptId,
      payload.scoreFinalExam,
      payload.scoreFinalExam,
      issuedAt,
      payload.createdBy ?? admin.actor,
    ],
  );

  await insertAuditLog({
    actor: admin.actor,
    role: admin.role,
    action: "admin.create-certificate",
    entityType: "certificate",
    entityId: certificateId,
    details: {
      trackId: trackMeta.id,
      learnerFullName: payload.learnerFullName,
    },
  });

  res.status(201).json({
    certificateId,
    verificationUrl: `${apiEnv.BASE_URL.replace(/\/$/, "")}/verify/${encodeURIComponent(certificateId)}`,
  });
});

app.post(["/forms/submit", "/api/forms/submit"], upload.array("attachments", 5), async (req, res) => {
  const schema = z.object({
    submissionType: z.enum([
      "Facility Escalation Packet",
      "Post-Op Graft Protocol Submission",
      "Training Request / Onboarding",
      "General Intake / IVR Intake",
    ]),
    siteType: z.enum(ALLOWED_SITE_TYPES),
    facilityName: z.string().min(1),
    caseId: z
      .union([z.string().min(1), z.literal("")])
      .optional()
      .transform((value) => (value ? value : undefined)),
    status: z.string().default("New"),
    assignedTo: z.string().optional(),
    notes: z.string().optional(),
  });

  const parseResult = schema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;
  const files = (req.files as Express.Multer.File[]) ?? [];
  const submissionId = randomUUID();
  const caseId = payload.caseId ?? buildCaseId();
  const attachments = files.map((file) => ({
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }));

  let smartsheetRowId: string | null = null;
  let smartsheetSynced = true;

  try {
    const row = await addRowByColumnTitle(smartsheetIds.forms, {
      SubmissionType: payload.submissionType,
      SiteType: payload.siteType,
      FacilityName: payload.facilityName,
      CaseId: caseId,
      Status: payload.status,
      AssignedTo: payload.assignedTo ?? "",
      Notes: payload.notes ?? "",
    });
    smartsheetRowId = row.rowId;

    for (const file of files) {
      await attachFileToRow(smartsheetIds.forms, row.rowId, {
        fileName: file.originalname,
        data: file.buffer,
        contentType: file.mimetype,
      });
    }
  } catch (error) {
    smartsheetSynced = false;
    await recordSyncRun("forms-submit", "warning", {
      submissionId,
      error: error instanceof Error ? error.message : "Unknown Smartsheet error",
    });
  }

  await query(
    `
      insert into form_submissions (
        submission_id, submission_type, site_type, facility_name, case_id, status,
        assigned_to, notes, attachments, smartsheet_row_id
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
    `,
    [
      submissionId,
      payload.submissionType,
      payload.siteType,
      payload.facilityName,
      caseId,
      payload.status,
      payload.assignedTo ?? null,
      payload.notes ?? null,
      JSON.stringify(attachments),
      smartsheetRowId,
    ],
  );

  res.status(201).json({
    submissionId,
    caseId,
    status: payload.status,
    attachments,
    smartsheetSynced,
  });
});

const ivrInsuranceVerificationSchema = z.object({
  requestSetup: z
    .object({
      salesExecutive: z.string().trim().nullable().optional(),
      requestType: z.string().trim().nullable().optional(),
      proceduralDate: z.string().trim().nullable().optional(),
    })
    .passthrough()
    .optional(),
  facilityPhysician: z
    .object({
      physicianName: z.string().trim().nullable().optional(),
      physicianSpecialty: z.string().trim().nullable().optional(),
      facilityName: z.string().trim().nullable().optional(),
      facilityAddress: z.string().trim().nullable().optional(),
      facilityCityStateZip: z.string().trim().nullable().optional(),
      contactName: z.string().trim().nullable().optional(),
      primaryCarePhysician: z.string().trim().nullable().optional(),
      primaryCarePhysicianPhone: z.string().trim().nullable().optional(),
      npi: z.string().trim().nullable().optional(),
      taxId: z.string().trim().nullable().optional(),
      ptan: z.string().trim().nullable().optional(),
      medicaidNumber: z.string().trim().nullable().optional(),
      phone: z.string().trim().nullable().optional(),
      fax: z.string().trim().nullable().optional(),
      accountNumber: z.string().trim().nullable().optional(),
      placeOfService: z.array(z.string().trim()).default([]),
    })
    .passthrough()
    .optional(),
  facility: z
    .object({
      providerOrPhysicianName: z.string().trim().nullable().optional(),
      facilityName: z.string().trim().nullable().optional(),
      renderingProviderName: z.string().trim().nullable().optional(),
      primaryCarePhysician: z.string().trim().nullable().optional(),
      primaryCarePhysicianPhone: z.string().trim().nullable().optional(),
      npi: z.string().trim().nullable().optional(),
      taxId: z.string().trim().nullable().optional(),
      ptan: z.string().trim().nullable().optional(),
      medicaidNumber: z.string().trim().nullable().optional(),
      phone: z.string().trim().nullable().optional(),
      fax: z.string().trim().nullable().optional(),
      accountNumber: z.string().trim().nullable().optional(),
      placeOfService: z.array(z.string().trim()).default([]),
    })
    .passthrough()
    .optional(),
  patient: z
    .object({
      patientName: z.string().trim().min(1),
      patientDob: z.string().trim().nullable().optional(),
      patientAddress: z.string().trim().nullable().optional(),
      patientCityStateZip: z.string().trim().nullable().optional(),
      inSkilledNursingFacility: z.string().trim().nullable().optional(),
      inSurgicalGlobalPeriod: z.string().trim().nullable().optional(),
    })
    .passthrough(),
  insurance: z
    .object({
      primary: z.record(z.string(), z.unknown()).optional(),
      secondary: z.record(z.string(), z.unknown()).optional(),
      workersCompOrVACaseManager: z.string().trim().nullable().optional(),
    })
    .passthrough()
    .optional(),
  products: z
    .object({
      selected: z.array(z.string().trim()).default([]),
      attemptAuthorizationIfNotCovered: z.boolean().default(false),
    })
    .passthrough(),
  testResults: z.record(z.string(), z.unknown()).optional(),
  diagnosis: z.record(z.string(), z.unknown()).optional(),
  wounds: z
    .object({
      woundTypes: z.array(z.string().trim()).default([]),
      wound1: z.record(z.string(), z.unknown()).optional(),
      wound2: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
  authorization: z
    .object({
      authorizedSignature: z.string().trim().nullable().optional(),
      signatureDate: z.string().trim().nullable().optional(),
      consentConfirmed: z.boolean().default(false),
    })
    .passthrough(),
  meta: z
    .object({
      formVersion: z.string().trim().default("AWB-IVR-v1"),
      generatedAt: z.string().trim().optional(),
    })
    .passthrough()
    .optional(),
});

app.post(
  [
    "/ivr/insurance-verification",
    "/api/ivr/insurance-verification",
    "/ivr/submit",
    "/api/ivr/submit",
  ],
  async (req, res) => {
    const parseResult = ivrInsuranceVerificationSchema.safeParse(req.body ?? {});

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.flatten() });
      return;
    }

    const payload = normalizeIvrInsurancePayload(parseResult.data);
    const payloadValidation = validateIvrInsurancePayload(payload);
    if (payloadValidation.length > 0) {
      res.status(400).json({
        message: "Validation failed.",
        errors: payloadValidation,
      });
      return;
    }
    const caseId = buildCaseId();
    const submissionId = randomUUID();
    const intakeId = randomUUID();
    const callId = `WEB-IVR-${new Date().toISOString().replaceAll(/[-:.TZ]/g, "").slice(0, 14)}-${Math.floor(
      Math.random() * 9000 + 1000,
    )}`;
    const siteType = resolveSiteTypeFromPos(payload.facilityPhysician.placeOfService);
    const woundType = resolveWoundTypeFromSelection(payload.wounds.woundTypes);
    const requestType = resolveRequestType(
      payload.requestSetup.requestType,
      payload.products.selected,
    );
    const redFlags: string[] = [];
    const routing = routeIvr({
      redFlags,
      requestType,
    });
    const status = "New";
    const nextActionDue = new Date(
      Date.now() + (routing.priority === "Urgent" ? 4 : 24) * 60 * 60 * 1000,
    ).toISOString();
    const callbackNumber =
      payload.facilityPhysician.phone ??
      payload.facilityPhysician.primaryCarePhysicianPhone ??
      "0000000";

    let formsSmartsheetRowId: string | null = null;
    let ivrSmartsheetRowId: string | null = null;
    let smartsheetSynced = true;

    try {
      const formsRow = await addRowByColumnTitle(smartsheetIds.forms, {
        SubmissionType: "General Intake / IVR Intake",
        SiteType: siteType,
        FacilityName: payload.facilityPhysician.facilityName,
        CaseId: caseId,
        Status: status,
        AssignedTo: routing.assignedTo,
        Notes: buildIvrSummaryNotes(payload),
      });
      formsSmartsheetRowId = formsRow.rowId;

      const ivrRow = await addRowByColumnTitle(smartsheetIds.ivr, {
        CallId: callId,
        CallerType: "Provider",
        Site: payload.facilityPhysician.facilityName,
        CallbackNumber: callbackNumber,
        WoundType: woundType,
        RedFlags: redFlags.join(", "),
        RequestType: requestType,
        Priority: routing.priority,
        AssignedTo: routing.assignedTo,
        Status: status,
        NextActionDue: nextActionDue,
      });
      ivrSmartsheetRowId = ivrRow.rowId;
    } catch (error) {
      smartsheetSynced = false;
      await recordSyncRun("ivr-insurance-submit", "warning", {
        submissionId,
        intakeId,
        error: error instanceof Error ? error.message : "Unknown Smartsheet error",
      });
    }

    await query(
      `
        insert into form_submissions (
          submission_id, submission_type, site_type, facility_name, case_id, status,
          assigned_to, notes, attachments, smartsheet_row_id
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, '[]'::jsonb, $9)
      `,
      [
        submissionId,
        "General Intake / IVR Intake",
        siteType,
        payload.facilityPhysician.facilityName,
        caseId,
        status,
        routing.assignedTo,
        JSON.stringify(payload),
        formsSmartsheetRowId,
      ],
    );

    await query(
      `
        insert into ivr_intakes (
          intake_id, call_id, caller_type, site, callback_number, wound_type, red_flags,
          request_type, priority, assigned_to, status, next_action_due, audio_attachments, smartsheet_row_id
        )
        values ($1, $2, $3, $4, $5, $6, '[]'::jsonb, $7, $8, $9, $10, $11, '[]'::jsonb, $12)
      `,
      [
        intakeId,
        callId,
        "Provider",
        payload.facilityPhysician.facilityName,
        callbackNumber,
        woundType,
        requestType,
        routing.priority,
        routing.assignedTo,
        status,
        nextActionDue,
        ivrSmartsheetRowId,
      ],
    );

    res.status(201).json({
      submissionId,
      intakeId,
      caseId,
      callId,
      status,
      priority: routing.priority,
      assignedTo: routing.assignedTo,
      nextActionDue,
      smartsheetSynced,
    });
  },
);

app.post(["/ivr/events", "/api/ivr/events"], upload.single("audio"), async (req, res) => {
  const schema = z.object({
    callId: z.string().min(1),
    callerType: z.enum(["SNF nurse", "Provider", "Patient", "Other"]),
    site: z.string().min(1),
    callbackNumber: z.string().min(7),
    woundType: z.enum(ALLOWED_WOUND_TYPES),
    redFlags: z.union([z.string(), z.array(z.string())]).optional(),
    requestType: z.enum(ALLOWED_REQUEST_TYPES),
    priority: z.enum(["Routine", "Urgent"]).optional(),
    audioUrl: z.string().url().optional(),
  });

  const parseResult = schema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;
  const redFlags = Array.isArray(payload.redFlags)
    ? payload.redFlags
    : splitList(payload.redFlags);
  const routing = routeIvr({
    redFlags,
    requestType: payload.requestType,
    priority: payload.priority,
  });
  const nextActionDue = new Date(
    Date.now() + (routing.priority === "Urgent" ? 4 : 24) * 60 * 60 * 1000,
  ).toISOString();
  const intakeId = randomUUID();
  const audioFile = req.file;
  const audioAttachments = [
    ...(audioFile
      ? [{ name: audioFile.originalname, mimeType: audioFile.mimetype, size: audioFile.size }]
      : []),
    ...(payload.audioUrl ? [{ name: "voicemail-link", url: payload.audioUrl }] : []),
  ];

  let smartsheetRowId: string | null = null;
  let smartsheetSynced = true;

  try {
    const row = await addRowByColumnTitle(smartsheetIds.ivr, {
      CallId: payload.callId,
      CallerType: payload.callerType,
      Site: payload.site,
      CallbackNumber: payload.callbackNumber,
      WoundType: payload.woundType,
      RedFlags: redFlags.join(", "),
      RequestType: payload.requestType,
      Priority: routing.priority,
      AssignedTo: routing.assignedTo,
      Status: "New",
      NextActionDue: nextActionDue,
    });
    smartsheetRowId = row.rowId;

    if (audioFile) {
      await attachFileToRow(smartsheetIds.ivr, row.rowId, {
        fileName: audioFile.originalname,
        data: audioFile.buffer,
        contentType: audioFile.mimetype,
      });
    }

    if (payload.audioUrl) {
      await attachLinkToRow(smartsheetIds.ivr, row.rowId, {
        url: payload.audioUrl,
        name: "Voicemail audio",
      });
    }
  } catch (error) {
    smartsheetSynced = false;
    await recordSyncRun("ivr-submit", "warning", {
      intakeId,
      error: error instanceof Error ? error.message : "Unknown Smartsheet error",
    });
  }

  await query(
    `
      insert into ivr_intakes (
        intake_id, call_id, caller_type, site, callback_number, wound_type, red_flags,
        request_type, priority, assigned_to, status, next_action_due, audio_attachments, smartsheet_row_id
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13::jsonb, $14)
    `,
    [
      intakeId,
      payload.callId,
      payload.callerType,
      payload.site,
      payload.callbackNumber,
      payload.woundType,
      JSON.stringify(redFlags),
      payload.requestType,
      routing.priority,
      routing.assignedTo,
      "New",
      nextActionDue,
      JSON.stringify(audioAttachments),
      smartsheetRowId,
    ],
  );

  res.status(201).json({
    intakeId,
    priority: routing.priority,
    assignedTo: routing.assignedTo,
    nextActionDue,
    smartsheetSynced,
  });
});

app.post(["/smartsheet/webhook", "/api/smartsheet/webhook"], async (req, res) => {
  const challenge = req.get("Smartsheet-Hook-Challenge");

  if (challenge) {
    res.setHeader("Smartsheet-Hook-Response", challenge);
    res.json({
      challenge,
      webhookId: req.body?.webhookId ?? null,
    });
    return;
  }

  const webhookPayload = req.body as Record<string, unknown>;
  const scopeObjectId =
    typeof webhookPayload.scopeObjectId === "string" || typeof webhookPayload.scopeObjectId === "number"
      ? String(webhookPayload.scopeObjectId)
      : null;
  const events = Array.isArray(webhookPayload.events) ? webhookPayload.events : [];

  await query(
    `
      insert into webhook_events (webhook_event_id, webhook_id, event_type, scope_object_id, payload)
      values ($1, $2, $3, $4, $5::jsonb)
    `,
    [
      randomUUID(),
      typeof webhookPayload.webhookId === "string" || typeof webhookPayload.webhookId === "number"
        ? String(webhookPayload.webhookId)
        : null,
      events.length > 0 ? String((events[0] as Record<string, unknown>).eventType ?? "change") : "change",
      scopeObjectId,
      JSON.stringify(webhookPayload),
    ],
  );

  if ([smartsheetIds.catalog, smartsheetIds.questionBank].includes(scopeObjectId ?? "")) {
    try {
      await syncContent("webhook");
    } catch (error) {
      await recordSyncRun("webhook", "warning", {
        error: error instanceof Error ? error.message : "Unknown sync error",
      });
    }
  }

  res.status(202).json({ accepted: true });
});

app.post(["/auth/register", "/api/auth/register"], async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().trim().min(1).max(120).optional(),
    lastName: z.string().trim().min(1).max(120).optional(),
  });
  const parseResult = schema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;
  const memberId = randomUUID();
  const email = payload.email.toLowerCase();
  const passwordHash = hashMemberPassword(payload.password);

  try {
    const [member] = await query<{
      member_id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      role: string;
      membership_status: string;
      created_at: string;
    }>(
      `
        insert into members (member_id, email, password_hash, first_name, last_name)
        values ($1, $2, $3, $4, $5)
        returning member_id, email, first_name, last_name, role, membership_status, created_at
      `,
      [memberId, email, passwordHash, payload.firstName ?? null, payload.lastName ?? null],
    );

    res.status(201).json({
      registered: true,
      member: {
        memberId: member.member_id,
        email: member.email,
        firstName: member.first_name,
        lastName: member.last_name,
        role: member.role,
        membershipStatus: member.membership_status,
        createdAt: member.created_at,
      },
    });
  } catch (error) {
    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      res.status(409).json({ error: "Member already exists." });
      return;
    }

    throw error;
  }
});

app.post(["/auth/login", "/api/auth/login"], async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parseResult = schema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;
  const email = payload.email.toLowerCase();
  const [member] = await query<{
    member_id: string;
    email: string;
    password_hash: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    membership_status: string;
  }>(
    `
      select member_id, email, password_hash, first_name, last_name, role, membership_status
      from members
      where email = $1
      limit 1
    `,
    [email],
  );

  if (!member || !verifyMemberPassword(payload.password, member.password_hash)) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  if (member.membership_status.toLowerCase() !== "active") {
    res.status(403).json({ error: "Membership is not active." });
    return;
  }

  const token = issueMemberToken({
    memberId: member.member_id,
    role: member.role,
    membershipStatus: member.membership_status,
  });

  await query(
    `
      insert into member_sessions (session_id, member_id, token_hash, ip_address, user_agent)
      values ($1, $2, $3, $4, $5)
    `,
    [
      randomUUID(),
      member.member_id,
      hashTokenFingerprint(token),
      req.ip ?? null,
      req.get("user-agent") ?? null,
    ],
  );

  res.json({
    loggedIn: true,
    token,
    expiresInSec: apiEnv.MEMBER_SESSION_TTL_SEC,
    member: {
      memberId: member.member_id,
      email: member.email,
      firstName: member.first_name,
      lastName: member.last_name,
      role: member.role,
      membershipStatus: member.membership_status,
    },
  });
});

app.get(["/auth/me", "/api/auth/me"], requireMember, async (req, res) => {
  const identity = getMemberIdentity(req);
  const [member] = await query<{
    member_id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    membership_status: string;
    created_at: string;
  }>(
    `
      select member_id, email, first_name, last_name, role, membership_status, created_at
      from members
      where member_id = $1
      limit 1
    `,
    [identity.memberId],
  );

  if (!member) {
    res.status(404).json({ error: "Member not found." });
    return;
  }

  res.json({
    member: {
      memberId: member.member_id,
      email: member.email,
      firstName: member.first_name,
      lastName: member.last_name,
      role: member.role,
      membershipStatus: member.membership_status,
      createdAt: member.created_at,
    },
  });
});

app.post(["/auth/logout", "/api/auth/logout"], requireMember, async (req, res) => {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (token) {
    await query(`delete from member_sessions where token_hash = $1`, [hashTokenFingerprint(token)]);
  }

  res.json({ loggedOut: true });
});

app.get(["/courses/provider-track", "/api/courses/provider-track"], requireMember, async (_req, res) => {
  const lessons = await query(
    `
      select lesson_id, track, module_id, module_title, lesson_title, video_url, duration_min, objectives, downloads, owner
      from content_lessons
      where track = 'Provider Track'
        and publish_status = 'Published'
      order by module_id, lesson_id
    `,
  );

  res.json({ lessons });
});

app.post(["/admin/login", "/api/admin/login"], async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    actor: z.string().trim().min(1).max(64).optional(),
    role: z.enum(["admin", "ops"]).default("admin"),
  });
  const parseResult = schema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;

  if (
    payload.email.toLowerCase() !== apiEnv.ADMIN_LOGIN_EMAIL.toLowerCase() ||
    payload.password !== apiEnv.ADMIN_LOGIN_PASSWORD
  ) {
    res.status(401).json({ error: "Invalid admin credentials." });
    return;
  }

  const identity = {
    actor: payload.actor ?? payload.email.split("@")[0] ?? "admin",
    role: payload.role,
  };
  const token = issueAdminToken(identity);

  res.json({
    loggedIn: true,
    token,
    actor: identity.actor,
    role: identity.role,
    expiresInSec: apiEnv.ADMIN_SESSION_TTL_SEC,
  });
});

app.post(["/admin/logout", "/api/admin/logout"], (_req, res) => {
  res.json({ loggedOut: true });
});

app.post(["/admin/sync", "/api/admin/sync"], requireAdmin, async (req, res) => {
  const admin = getAdminIdentity(req);
  const summary = await syncContent("admin");

  await insertAuditLog({
    actor: admin.actor,
    role: admin.role,
    action: "admin.sync",
    entityType: "content",
    entityId: "catalog+question-bank",
    details: { ...summary },
  });

  res.json(summary);
});

app.post(["/admin/reset", "/api/admin/reset"], requireAdmin, async (req, res) => {
  const schema = z.object({
    clearCatalog: z.coerce.boolean().default(true),
  });
  const parseResult = schema.safeParse(req.body ?? {});
  const payload = parseResult.success ? parseResult.data : { clearCatalog: true };
  const admin = getAdminIdentity(req);

  await resetOperationalData(payload.clearCatalog);
  const seedSummary = await ensureDemoCatalogAndQuestions();

  await insertAuditLog({
    actor: admin.actor,
    role: admin.role,
    action: "admin.reset",
    entityType: "platform",
    entityId: "demo-data",
    details: {
      clearCatalog: payload.clearCatalog,
      ...seedSummary,
    },
  });

  res.json({
    reset: true,
    ...seedSummary,
  });
});

app.get(["/admin/forms", "/api/admin/forms"], requireAdmin, async (req, res) => {
  const rows = await query(
    `
      select submission_id, submission_type, site_type, facility_name, case_id, status, assigned_to,
        notes, attachments, smartsheet_row_id, created_at
      from form_submissions
      order by created_at desc
      limit 100
    `,
  );

  res.json({ forms: rows });
});

app.get(["/admin/assets", "/api/admin/assets"], requireAdmin, async (_req, res) => {
  const rows = await query<MediaAssetRow>(
    `
      select asset_id, title, description, media_type, mime_type, file_ext, file_size::text,
        storage_name, storage_path, duration_sec, page_count, processing_status, processing_notes,
        created_by, created_at
      from media_assets
      order by created_at desc
      limit 500
    `,
  );

  res.json({
    assets: rows.map(mapMediaAsset),
  });
});

app.post(
  ["/admin/assets/upload", "/api/admin/assets/upload"],
  requireAdmin,
  mediaUpload.single("file"),
  async (req, res) => {
    const schema = z.object({
      title: z.string().trim().min(1).max(160).optional(),
      description: z.string().trim().max(2000).optional(),
    });
    const parseResult = schema.safeParse(req.body ?? {});
    const file = req.file as Express.Multer.File | undefined;

    if (!parseResult.success) {
      if (file?.path) {
        await fs.unlink(file.path).catch(() => undefined);
      }
      res.status(400).json({ error: parseResult.error.flatten() });
      return;
    }

    if (!file) {
      res.status(400).json({ error: "A video, audio, or PDF file is required." });
      return;
    }

    const media = detectMedia(file.originalname, file.mimetype);
    if (!media) {
      await fs.unlink(file.path).catch(() => undefined);
      res.status(400).json({
        error: "Unsupported file type. Upload video, audio, or PDF files only.",
      });
      return;
    }

    const admin = getAdminIdentity(req);
    const assetId = randomUUID();
    let stored: { absolutePath: string; relativePath: string; storageName: string } | null = null;

    try {
      stored = await moveUploadToMediaStorage({
        tempPath: file.path,
        assetId,
        extension: media.extension,
      });

      const processing = await inspectMediaProcessing(media.mediaType, stored.absolutePath);
      const notes = [processing.notes].filter(Boolean).join(" ").trim() || null;
      const [row] = await query<MediaAssetRow>(
        `
          insert into media_assets (
            asset_id, title, description, media_type, mime_type, file_ext, file_size,
            storage_path, storage_name, duration_sec, page_count, processing_status,
            processing_notes, created_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          returning asset_id, title, description, media_type, mime_type, file_ext, file_size::text,
            storage_name, storage_path, duration_sec, page_count, processing_status, processing_notes,
            created_by, created_at
        `,
        [
          assetId,
          parseResult.data.title ?? file.originalname,
          parseResult.data.description ?? null,
          media.mediaType,
          media.mimeType,
          media.extension,
          file.size,
          stored.relativePath,
          file.originalname,
          processing.durationSec,
          processing.pageCount,
          notes ? "ready-with-warnings" : "ready",
          notes,
          admin.actor,
        ],
      );

      await insertAuditLog({
        actor: admin.actor,
        role: admin.role,
        action: "admin.upload-asset",
        entityType: "media_asset",
        entityId: assetId,
        details: {
          mediaType: media.mediaType,
          mimeType: media.mimeType,
          fileSize: file.size,
        },
      });

      res.status(201).json(mapMediaAsset(row));
    } catch (error) {
      if (stored?.absolutePath) {
        await fs.unlink(stored.absolutePath).catch(() => undefined);
      } else if (file.path) {
        await fs.unlink(file.path).catch(() => undefined);
      }

      res.status(500).json({
        error: error instanceof Error ? error.message : "Asset upload failed.",
      });
    }
  },
);

app.delete(["/admin/assets/:assetId", "/api/admin/assets/:assetId"], requireAdmin, async (req, res) => {
  const assetId = getRouteParam(req.params.assetId).trim();

  if (!assetId) {
    res.status(400).json({ error: "Asset ID is required." });
    return;
  }

  const admin = getAdminIdentity(req);
  const [deletedRow] = await query<
    Pick<MediaAssetRow, "asset_id" | "media_type" | "file_size" | "storage_path" | "storage_name">
  >(
    `
      delete from media_assets
      where asset_id = $1
      returning asset_id, media_type, file_size::text, storage_path, storage_name
    `,
    [assetId],
  );

  if (!deletedRow) {
    res.status(404).json({ error: "Asset not found." });
    return;
  }

  let warning: string | null = null;
  let fileDeleted = false;

  try {
    const absolutePath = resolveStoredMediaPath(deletedRow.storage_path);
    try {
      await fs.unlink(absolutePath);
      fileDeleted = true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        warning = "Asset record deleted, but stored media file was already missing.";
      } else {
        warning = "Asset record deleted, but media file cleanup failed.";
      }
    }
  } catch {
    warning = "Asset record deleted, but stored media path was invalid.";
  }

  await insertAuditLog({
    actor: admin.actor,
    role: admin.role,
    action: "admin.delete-asset",
    entityType: "media_asset",
    entityId: deletedRow.asset_id,
    details: {
      mediaType: deletedRow.media_type,
      fileSize: Number(deletedRow.file_size),
      fileDeleted,
      warning,
    },
  });

  res.json({
    deleted: true,
    assetId: deletedRow.asset_id,
    fileDeleted,
    warning,
  });
});

app.get(
  ["/admin/videos/generate", "/api/admin/videos/generate", "/admin/generate-lesson-video", "/api/admin/generate-lesson-video"],
  requireAdmin,
  async (req, res) => {
  const schema = z.object({
    limit: z.coerce.number().int().positive().max(200).default(50),
  });
  const parseResult = schema.safeParse(req.query ?? {});

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const rows = await query<VideoGenerationJobRow>(
    `
      select job_id, lesson_id, source_row_id, asset_id, status, voice_id, request_payload,
        warnings, error_message, created_by, started_at, completed_at, created_at
      from video_generation_jobs
      order by created_at desc
      limit $1
    `,
    [parseResult.data.limit],
  );

  res.json({
    jobs: rows.map(mapVideoGenerationJob),
  });
},
);

app.get(
  [
    "/admin/videos/generate/:jobId",
    "/api/admin/videos/generate/:jobId",
    "/admin/generate-lesson-video/:jobId",
    "/api/admin/generate-lesson-video/:jobId",
  ],
  requireAdmin,
  async (req, res) => {
  const jobId = getRouteParam(req.params.jobId);
  const [row] = await query<VideoGenerationJobRow>(
    `
      select job_id, lesson_id, source_row_id, asset_id, status, voice_id, request_payload,
        warnings, error_message, created_by, started_at, completed_at, created_at
      from video_generation_jobs
      where job_id = $1
      limit 1
    `,
    [jobId],
  );

  if (!row) {
    res.status(404).json({ error: "Generation job not found." });
    return;
  }

  res.json(mapVideoGenerationJob(row));
},
);

app.post(
  ["/admin/videos/generate", "/api/admin/videos/generate", "/admin/generate-lesson-video", "/api/admin/generate-lesson-video"],
  requireAdmin,
  async (req, res) => {
  const parseResult = videoGenerationPayloadSchema.safeParse(req.body ?? {});
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;
  const admin = getAdminIdentity(req);

  const [lessonRow] = payload.lessonId
    ? await query<{
        lesson_id: string;
        source_row_id: string | null;
        lesson_title: string;
        module_title: string;
        track: string;
        owner: string | null;
        video_url: string | null;
      }>(
        `
          select lesson_id, source_row_id, lesson_title, module_title, track, owner, video_url
          from content_lessons
          where lesson_id = $1
          limit 1
        `,
        [payload.lessonId],
      )
    : [null];

  if (payload.lessonId && !lessonRow) {
    res.status(404).json({ error: "Lesson not found for generation request." });
    return;
  }

  const lessonMeta = payload.lessonMeta ?? {};
  const voice = payload.voice;
  const render = payload.render;
  const brand = payload.brand;

  const resolvedPayload: VideoGenerationRequestPayload = {
    lessonId: payload.lessonId ?? null,
    lessonCode: payload.lessonCode ?? payload.lessonId ?? null,
    lessonTitle:
      payload.lessonTitle ??
      payload.title ??
      lessonMeta.lessonTitle ??
      lessonRow?.lesson_title ??
      "",
    moduleTitle:
      payload.moduleTitle ??
      payload.module ??
      lessonMeta.moduleTitle ??
      lessonRow?.module_title ??
      "",
    track: payload.track ?? lessonMeta.track ?? lessonRow?.track ?? "",
    owner: payload.owner ?? payload.course ?? lessonRow?.owner ?? "AWB Academy",
    runtimeSec: payload.runtime ?? null,
    script: payload.script ?? null,
    slides:
      payload.slides?.map((slide, index) => ({
        id: slide.id ?? `s${index + 1}`,
        layout: slide.layout,
        title: slide.title,
        bullets: slide.bullets ?? [],
        callout: slide.callout ?? null,
        narration: slide.narration,
      })) ??
      payload.scenes?.map((scene, index) => ({
        id: scene.id ?? `scene-${scene.scene ?? index + 1}`,
        layout: index === 0 ? "title" : "bullets",
        title: scene.slide,
        bullets: [],
        callout: null,
        narration: scene.narration,
      })) ??
      null,
    ttsProvider: voice?.provider ?? payload.ttsProvider ?? apiEnv.VIDEO_GENERATION_DEFAULT_PROVIDER,
    voiceId: voice?.voiceId ?? payload.voiceId,
    voiceEngine: voice?.engine ?? payload.voiceEngine,
    openAiModel: voice?.model ?? payload.openAiModel ?? apiEnv.VIDEO_GENERATION_OPENAI_MODEL,
    renderWidth: render?.width ?? 1920,
    renderHeight: render?.height ?? 1080,
    renderFps: render?.fps ?? 30,
    brandLogoUrl: brand?.logoUrl ?? null,
    brandPrimaryColor: brand?.primaryColor ?? "#0F3D75",
    brandAccentColor: brand?.accentColor ?? "#2E89FF",
    brandFontFamily: brand?.fontFamily ?? "Inter, Arial, Helvetica, sans-serif",
    updateLessonVideoUrl:
      payload.lessonId !== undefined
        ? payload.updateLessonVideoUrl ?? true
        : (payload.updateLessonVideoUrl ?? false),
    syncSmartsheetVideoUrl:
      payload.lessonId !== undefined
        ? payload.syncSmartsheetVideoUrl ?? (payload.updateLessonVideoUrl ?? true)
        : false,
    publishAfterGenerate: payload.publishAfterGenerate ?? false,
    overwriteExistingVideo: payload.overwriteExistingVideo ?? false,
  };

  const missingFields = [
    resolvedPayload.lessonTitle ? null : "lessonTitle",
    resolvedPayload.moduleTitle ? null : "moduleTitle",
    resolvedPayload.track ? null : "track",
    resolvedPayload.voiceId ? null : "voice.voiceId",
    resolvedPayload.voiceEngine ? null : "voice.engine",
  ].filter((value): value is string => Boolean(value));

  if (missingFields.length > 0) {
    res.status(400).json({
      error: `Missing required generation fields: ${missingFields.join(", ")}.`,
    });
    return;
  }

  if (resolvedPayload.ttsProvider === "openai-tts" && !apiEnv.OPENAI_API_KEY) {
    res.status(400).json({
      error: "OPENAI_API_KEY is required when ttsProvider=openai-tts.",
    });
    return;
  }

  const estimatedDurationSec = estimateNarrationSeconds({
    script: resolvedPayload.script,
    slides: resolvedPayload.slides?.map((slide) => ({ narration: slide.narration })) ?? null,
  });
  if (estimatedDurationSec < 15) {
    res.status(400).json({
      error: "Estimated narration duration is under 15 seconds. Add more instructional narration before rendering.",
    });
    return;
  }

  if (
    lessonRow?.video_url &&
    !resolvedPayload.overwriteExistingVideo &&
    resolvedPayload.updateLessonVideoUrl
  ) {
    res.status(409).json({
      error: "Lesson already has a VideoUrl. Set overwriteExistingVideo=true to replace it.",
    });
    return;
  }

  const jobId = randomUUID();
  const [job] = await query<VideoGenerationJobRow>(
    `
      insert into video_generation_jobs (
        job_id, lesson_id, source_row_id, status, voice_id, request_payload, warnings, created_by
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
      returning job_id, lesson_id, source_row_id, asset_id, status, voice_id, request_payload,
        warnings, error_message, created_by, started_at, completed_at, created_at
    `,
    [
      jobId,
      resolvedPayload.lessonId,
      lessonRow?.source_row_id ?? null,
      "queued",
      resolvedPayload.voiceId,
      JSON.stringify(resolvedPayload),
      "[]",
      admin.actor,
    ],
  );

  await insertAuditLog({
    actor: admin.actor,
    role: admin.role,
    action: "admin.video-generation.queued",
    entityType: "video_generation_job",
    entityId: jobId,
    details: {
      lessonId: resolvedPayload.lessonId,
      voiceId: resolvedPayload.voiceId,
      updateLessonVideoUrl: resolvedPayload.updateLessonVideoUrl,
      syncSmartsheetVideoUrl: resolvedPayload.syncSmartsheetVideoUrl,
    },
  });

  queueVideoGeneration(jobId);

  res.status(202).json({
    jobId: job.job_id,
    lessonId: job.lesson_id,
    status: job.status,
  });
},
);

app.get(["/admin/catalog", "/api/admin/catalog"], requireAdmin, async (_req, res) => {
  const [tracks, lessons] = await Promise.all([
    listTracks(true),
    listLessonsByTrack(undefined, true),
  ]);

  res.json({
    tracks,
    lessons,
  });
});

app.get(["/admin/dashboard", "/api/admin/dashboard"], requireAdmin, async (_req, res) => {
  const [forms, ivr, webhooks, syncRuns] = await Promise.all([
    query(`select submission_id, submission_type, status, created_at from form_submissions order by created_at desc limit 10`),
    query(`select intake_id, call_id, priority, assigned_to, created_at from ivr_intakes order by created_at desc limit 10`),
    query(`select webhook_event_id, event_type, scope_object_id, received_at from webhook_events order by received_at desc limit 10`),
    query(`select sync_run_id, source, status, details, created_at from sync_runs order by created_at desc limit 10`),
  ]);

  res.json({
    forms,
    ivr,
    webhooks,
    syncRuns,
  });
});

app.post(["/admin/lessons/:lessonId/publish", "/api/admin/lessons/:lessonId/publish"], requireAdmin, async (req, res) => {
  const lessonId = getRouteParam(req.params.lessonId);
  const schema = z.object({
    publishStatus: z.enum(["Published", "Draft"]),
  });
  const parseResult = schema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;
  const admin = getAdminIdentity(req);
  const [existing] = await query<{
    lesson_id: string;
    module_id: string;
    source_row_id: string | null;
    publish_status: string;
  }>(
    `
      select lesson_id, module_id, source_row_id, publish_status
      from content_lessons
      where lesson_id = $1
      limit 1
    `,
    [lessonId],
  );

  if (!existing) {
    res.status(404).json({ error: "Lesson not found." });
    return;
  }

  let smartsheetSynced = false;
  let syncWarning: string | null = null;

  if (existing.source_row_id && isSmartsheetConfigured()) {
    try {
      await updateRowByColumnTitle(smartsheetIds.catalog, existing.source_row_id, {
        PublishStatus: payload.publishStatus,
      });
      smartsheetSynced = true;
    } catch (error) {
      syncWarning = error instanceof Error ? error.message : "Smartsheet update failed.";
      await recordSyncRun("admin.publish-status", "warning", {
        lessonId,
        sourceRowId: existing.source_row_id,
        publishStatus: payload.publishStatus,
        error: syncWarning,
      });
    }
  } else {
    syncWarning = existing.source_row_id
      ? "Smartsheet is not configured."
      : "Lesson has no source Smartsheet row id.";
  }

  const [updated] = await query<{
    lesson_id: string;
    module_id: string;
    publish_status: string;
  }>(
    `
      update content_lessons
      set publish_status = $2
      where lesson_id = $1
      returning lesson_id, module_id, publish_status
    `,
    [lessonId, payload.publishStatus],
  );

  await insertAuditLog({
    actor: admin.actor,
    role: admin.role,
    action: "admin.update-publish-status",
    entityType: "lesson",
    entityId: lessonId,
    details: {
      moduleId: updated.module_id,
      previousStatus: existing.publish_status,
      publishStatus: updated.publish_status,
      smartsheetSynced,
      syncWarning,
    },
  });

  res.json({
    lessonId: updated.lesson_id,
    moduleId: updated.module_id,
    publishStatus: updated.publish_status,
    smartsheetSynced,
    syncWarning,
  });
});

app.patch(
  ["/admin/lessons/:lessonId/video-url", "/api/admin/lessons/:lessonId/video-url"],
  requireAdmin,
  async (req, res) => {
    const lessonId = getRouteParam(req.params.lessonId);
    const schema = z.object({
      videoUrl: z.string().trim().min(1),
      overwriteExistingVideo: z.coerce.boolean().default(false),
      syncSmartsheet: z.coerce.boolean().default(false),
    });
    const parseResult = schema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.flatten() });
      return;
    }

    const payload = parseResult.data;
    const admin = getAdminIdentity(req);

    const [existing] = await query<{
      lesson_id: string;
      module_id: string;
      source_row_id: string | null;
    }>(
      `
        select lesson_id, module_id, source_row_id
        from content_lessons
        where lesson_id = $1
        limit 1
      `,
      [lessonId],
    );

    if (!existing) {
      res.status(404).json({ error: "Lesson not found." });
      return;
    }

    const attachResult = await attachVideoToLessonRecord({
      lessonId,
      videoUrl: payload.videoUrl,
      overwriteExistingVideo: payload.overwriteExistingVideo,
    });

    let smartsheetSynced = false;
    let syncWarning: string | null = null;

    if (payload.syncSmartsheet) {
      const sourceRowId = attachResult.sourceRowId ?? existing.source_row_id;
      if (!sourceRowId) {
        syncWarning = "Lesson has no source Smartsheet row id.";
      } else if (!isSmartsheetConfigured()) {
        syncWarning = "Smartsheet is not configured.";
      } else {
        try {
          await updateRowByColumnTitle(smartsheetIds.catalog, sourceRowId, {
            VideoUrl: payload.videoUrl,
          });
          smartsheetSynced = true;
        } catch (error) {
          syncWarning = error instanceof Error ? error.message : "Smartsheet update failed.";
          await recordSyncRun("admin.update-video-url", "warning", {
            lessonId,
            sourceRowId,
            error: syncWarning,
          });
        }
      }
    }

    await insertAuditLog({
      actor: admin.actor,
      role: admin.role,
      action: "admin.update-video-url",
      entityType: "lesson",
      entityId: lessonId,
      details: {
        moduleId: existing.module_id,
        videoUrl: payload.videoUrl,
        overwriteExistingVideo: payload.overwriteExistingVideo,
        smartsheetSynced,
        syncWarning,
      },
    });

    res.json({
      lessonId,
      moduleId: existing.module_id,
      videoUrl: payload.videoUrl,
      smartsheetSynced,
      syncWarning,
    });
  },
);

app.get(["/admin/diagnostics", "/api/admin/diagnostics"], requireAdmin, async (_req, res) => {
  const [latestSync] = await query<{ created_at: string; status: string; source: string }>(
    `select created_at, status, source from sync_runs order by created_at desc limit 1`,
  );
  const checks = await Promise.allSettled([
    getSheet(smartsheetIds.catalog),
    getSheet(smartsheetIds.questionBank),
    getSheet(smartsheetIds.results),
    getSheet(smartsheetIds.forms),
    getSheet(smartsheetIds.ivr),
  ]);
  const labels = ["catalog", "questionBank", "results", "forms", "ivr"];
  const sheets = checks.map((result, index) => ({
    sheet: labels[index],
    ok: result.status === "fulfilled",
    detail:
      result.status === "fulfilled"
        ? {
            name: result.value.name,
            columnCount: result.value.columns?.length ?? 0,
            rowCount: result.value.rows?.length ?? 0,
          }
        : result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
  }));

  res.json({
    status: sheets.every((sheet) => sheet.ok) ? "ok" : "degraded",
    version: apiEnv.APP_VERSION,
    latestSync: latestSync ?? null,
    sheets,
  });
});

app.get(["/admin/experiments/report", "/api/admin/experiments/report"], requireAdmin, async (req, res) => {
  const schema = z.object({
    experimentId: z.string().trim().min(1).default(HERO_EXPERIMENT.id),
  });
  const parseResult = schema.safeParse(req.query);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const { experimentId } = parseResult.data;

  if (experimentId !== HERO_EXPERIMENT.id) {
    res.status(404).json({ error: "Experiment not found." });
    return;
  }

  const aggregateRows = await query<{
    variant_id: string;
    event_type: string;
    event_count: string;
    session_count: string;
  }>(
    `
      select
        variant_id,
        event_type,
        count(*)::text as event_count,
        count(distinct session_key)::text as session_count
      from experiment_events
      where experiment_id = $1
      group by variant_id, event_type
      order by variant_id asc, event_type asc
    `,
    [experimentId],
  );
  const recentEvents = await query<{
    variant_id: string;
    event_type: string;
    session_key: string;
    user_id: string | null;
    path: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>(
    `
      select variant_id, event_type, session_key, user_id, path, metadata, created_at
      from experiment_events
      where experiment_id = $1
      order by created_at desc
      limit 25
    `,
    [experimentId],
  );

  const variants = HERO_EXPERIMENT.variants.map((variant) => {
    const impressionRow = aggregateRows.find(
      (row) => row.variant_id === variant.id && row.event_type === "impression",
    );
    const clickRow = aggregateRows.find(
      (row) => row.variant_id === variant.id && row.event_type === "cta-click",
    );
    const impressionSessions = Number(impressionRow?.session_count ?? 0);
    const clickSessions = Number(clickRow?.session_count ?? 0);

    return {
      variantId: variant.id,
      label: variant.label,
      headline: variant.headline,
      impressions: Number(impressionRow?.event_count ?? 0),
      impressionSessions,
      clicks: Number(clickRow?.event_count ?? 0),
      clickSessions,
      ctr: impressionSessions > 0 ? Number(((clickSessions / impressionSessions) * 100).toFixed(1)) : 0,
    };
  });

  const totalImpressionSessions = variants.reduce((sum, variant) => sum + variant.impressionSessions, 0);
  const totalClickSessions = variants.reduce((sum, variant) => sum + variant.clickSessions, 0);

  res.json({
    experimentId,
    name: HERO_EXPERIMENT.name,
    status: HERO_EXPERIMENT.status,
    hypothesis: HERO_EXPERIMENT.hypothesis,
    qa: HERO_EXPERIMENT.qa,
    variants,
    totals: {
      impressionSessions: totalImpressionSessions,
      clickSessions: totalClickSessions,
      ctr:
        totalImpressionSessions > 0
          ? Number(((totalClickSessions / totalImpressionSessions) * 100).toFixed(1))
          : 0,
    },
    recentEvents: recentEvents.map((row) => ({
      variantId: row.variant_id,
      eventType: row.event_type,
      sessionKey: row.session_key,
      userId: row.user_id,
      path: row.path,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
    })),
  });
});

app.post(["/admin/share-sheet", "/api/admin/share-sheet"], requireAdmin, async (req, res) => {
  const schema = z.object({
    sheetType: z.enum(["catalog", "questionbank", "results", "forms", "ivr"]),
    email: z.string().email(),
    accessLevel: z.enum(["VIEWER", "COMMENTER", "EDITOR", "EDITOR_SHARE", "ADMIN"]),
  });
  const parseResult = schema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const admin = getAdminIdentity(req);

  try {
    assertShareRole(admin.role, parseResult.data.sheetType);
  } catch (error) {
    res.status(403).json({ error: error instanceof Error ? error.message : "Forbidden" });
    return;
  }

  const sheetMap = {
    catalog: smartsheetIds.catalog,
    questionbank: smartsheetIds.questionBank,
    results: smartsheetIds.results,
    forms: smartsheetIds.forms,
    ivr: smartsheetIds.ivr,
  };
  const share = await shareSheet(
    sheetMap[parseResult.data.sheetType],
    parseResult.data.email,
    parseResult.data.accessLevel,
  );

  await insertAuditLog({
    actor: admin.actor,
    role: admin.role,
    action: "admin.share-sheet",
    entityType: "sheet",
    entityId: parseResult.data.sheetType,
    details: {
      email: parseResult.data.email,
      accessLevel: parseResult.data.accessLevel,
      shareId: share.id,
    },
  });

  res.json({
    shared: true,
    share,
  });
});

app.post(
  [
    "/admin/certificates/:certificateId/revoke",
    "/api/admin/certificates/:certificateId/revoke",
    "/api/certificates/:certificateId/revoke",
  ],
  requireAdmin,
  async (req, res) => {
    const certificateId = getRouteParam(req.params.certificateId);
    const schema = z.object({
      reason: z.string().trim().min(1).optional(),
    });
    const parseResult = schema.safeParse(req.body ?? {});
    const admin = getAdminIdentity(req);
    const reason = parseResult.success ? parseResult.data.reason ?? null : null;

    const rows = await query<{ certificate_id: string }>(
      `
        update certificates
        set status = 'revoked',
            revoked_at = now(),
            revoked_reason = coalesce($2, revoked_reason)
        where certificate_id = $1
        returning certificate_id
      `,
      [certificateId, reason],
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Certificate not found." });
      return;
    }

    await insertAuditLog({
      actor: admin.actor,
      role: admin.role,
      action: "admin.revoke-certificate",
      entityType: "certificate",
      entityId: certificateId,
      details: reason ? { reason } : undefined,
    });

    res.json({
      revoked: true,
      certificateId,
      revokedReason: reason,
    });
  },
);

interface TrackPathProgressResponse {
  userId: string;
  track: string;
  trackId: string;
  modules: Array<{
    moduleId: string;
    moduleTitle: string;
    firstLessonId: string | null;
    totalLessons: number;
    completedLessons: number;
    unlocked: boolean;
    quizUnlocked: boolean;
    quizPassed: boolean;
    quizLockedReason: string | null;
  }>;
  finalExam: {
    unlocked: boolean;
    reason: string | null;
  };
}

function resolveTrackMeta(trackInput: string) {
  const normalizedTrackInput = trackInput.toLowerCase();
  return (
    PROGRAM_TRACKS.find(
      (track) =>
        track.id === trackInput ||
        track.title.toLowerCase() === normalizedTrackInput ||
        track.catalogName.toLowerCase() === normalizedTrackInput ||
        normalizedTrackInput.includes(track.code.toLowerCase()),
    ) ?? null
  );
}

async function buildTrackPathProgress(
  userId: string,
  trackInput: string,
  trackMeta: (typeof PROGRAM_TRACKS)[number],
): Promise<TrackPathProgressResponse> {
  const moduleSequence = [
    ...PROGRAM_CATALOG.sharedCore.map((module) => module.id),
    ...PROGRAM_CATALOG.trackModules[trackMeta.id].map((module) => module.id),
  ];
  const moduleCatalog = new Map(
    [
      ...PROGRAM_CATALOG.sharedCore,
      ...PROGRAM_CATALOG.trackModules[trackMeta.id],
    ].map((module) => [module.id, module]),
  );

  const lessonProgressRows = await query<{
    module_id: string;
    module_title: string;
    first_lesson_id: string | null;
    total_lessons: string;
    completed_lessons: string;
  }>(
    `
      select
        cl.module_id,
        min(cl.module_title) as module_title,
        min(cl.lesson_id) as first_lesson_id,
        count(*)::text as total_lessons,
        count(*) filter (where lp.completed = true)::text as completed_lessons
      from content_lessons cl
      left join lesson_progress lp
        on lp.lesson_id = cl.lesson_id
       and lp.user_id = $2
      where cl.module_id = any($1::text[])
        and cl.publish_status = 'Published'
      group by cl.module_id
    `,
    [moduleSequence, userId],
  );
  const passedQuizRows = await query<{
    module_id: string;
  }>(
    `
      select distinct module_id
      from quiz_attempts
      where user_id = $1
        and module_id = any($2::text[])
        and pass_fail = true
    `,
    [userId, moduleSequence],
  );

  const lessonMap = new Map(lessonProgressRows.map((row) => [row.module_id, row]));
  const passedModules = new Set(passedQuizRows.map((row) => row.module_id));
  const modules: TrackPathProgressResponse["modules"] = [];
  let previousQuizPassed = true;

  for (const moduleId of moduleSequence) {
    const lessonState = lessonMap.get(moduleId);
    const catalogModule = moduleCatalog.get(moduleId);
    const totalLessons = Number(lessonState?.total_lessons ?? "0");
    const completedLessons = Number(lessonState?.completed_lessons ?? "0");
    const lessonsComplete = totalLessons > 0 && completedLessons >= totalLessons;
    const unlocked: boolean = previousQuizPassed;
    const quizUnlocked: boolean = unlocked && lessonsComplete;
    const quizPassed: boolean = passedModules.has(moduleId);
    const quizLockedReason = !unlocked
      ? "Complete and pass the previous module quiz first."
      : !lessonsComplete
        ? "Complete all module lessons first."
        : null;

    modules.push({
      moduleId,
      moduleTitle: lessonState?.module_title ?? catalogModule?.title ?? moduleId,
      firstLessonId: lessonState?.first_lesson_id ?? null,
      totalLessons,
      completedLessons,
      unlocked,
      quizUnlocked,
      quizPassed,
      quizLockedReason,
    });

    previousQuizPassed = unlocked && quizPassed;
  }

  const allModuleQuizzesPassed = modules.every((module) => module.quizPassed);

  return {
    userId,
    track: trackMeta.title || trackInput,
    trackId: trackMeta.id,
    modules,
    finalExam: {
      unlocked: allModuleQuizzesPassed,
      reason: allModuleQuizzesPassed
        ? null
        : "Pass all module quizzes to unlock the final exam.",
    },
  };
}

function getRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

interface NormalizedIvrInsurancePayload {
  requestSetup: {
    salesExecutive: string | null;
    requestType: string | null;
    proceduralDate: string | null;
  };
  facilityPhysician: {
    physicianName: string | null;
    physicianSpecialty: string | null;
    facilityName: string;
    facilityAddress: string | null;
    facilityCityStateZip: string | null;
    contactName: string | null;
    primaryCarePhysician: string | null;
    primaryCarePhysicianPhone: string | null;
    npi: string | null;
    taxId: string | null;
    ptan: string | null;
    medicaidNumber: string | null;
    phone: string | null;
    fax: string | null;
    accountNumber: string | null;
    placeOfService: string[];
  };
  patient: {
    patientName: string;
    patientDob: string | null;
    patientAddress: string | null;
    patientCityStateZip: string | null;
    inSkilledNursingFacility: string | null;
    inSurgicalGlobalPeriod: string | null;
  };
  insurance: {
    primary: {
      payerName: string | null;
      facilityName: string | null;
      policyNumber: string | null;
      payerPhone: string | null;
      facilityInNetwork: string | null;
      providerInNetwork: string | null;
    };
    secondary: {
      payerName: string | null;
      facilityName: string | null;
      policyNumber: string | null;
      payerPhone: string | null;
      facilityInNetwork: string | null;
      providerInNetwork: string | null;
    };
    workersCompOrVACaseManager: string | null;
  };
  products: {
    selected: string[];
    attemptAuthorizationIfNotCovered: boolean;
  };
  testResults?: Record<string, unknown>;
  diagnosis?: Record<string, unknown>;
  wounds: {
    woundTypes: string[];
    wound1?: Record<string, unknown>;
    wound2?: Record<string, unknown>;
  };
  authorization: {
    authorizedSignature: string | null;
    signatureDate: string | null;
    consentConfirmed: boolean;
  };
  meta: {
    formVersion: string;
    generatedAt: string;
  };
}

function normalizeIvrInsurancePayload(
  payload: z.infer<typeof ivrInsuranceVerificationSchema>,
): NormalizedIvrInsurancePayload {
  const facilitySource = payload.facilityPhysician ?? payload.facility ?? {};
  const primaryInsurance = payload.insurance?.primary as Record<string, unknown> | undefined;
  const secondaryInsurance = payload.insurance?.secondary as Record<string, unknown> | undefined;

  return {
    requestSetup: {
      salesExecutive: readNullableString(payload.requestSetup, "salesExecutive"),
      requestType: readNullableString(payload.requestSetup, "requestType"),
      proceduralDate: readNullableString(payload.requestSetup, "proceduralDate"),
    },
    facilityPhysician: {
      physicianName:
        readNullableString(payload.facilityPhysician, "physicianName") ??
        readNullableString(payload.facility, "providerOrPhysicianName"),
      physicianSpecialty: readNullableString(payload.facilityPhysician, "physicianSpecialty"),
      facilityName:
        readNullableString(payload.facilityPhysician, "facilityName") ??
        readNullableString(payload.facility, "facilityName") ??
        "",
      facilityAddress: readNullableString(payload.facilityPhysician, "facilityAddress"),
      facilityCityStateZip: readNullableString(payload.facilityPhysician, "facilityCityStateZip"),
      contactName: readNullableString(payload.facilityPhysician, "contactName"),
      primaryCarePhysician:
        readNullableString(payload.facilityPhysician, "primaryCarePhysician") ??
        readNullableString(payload.facility, "primaryCarePhysician"),
      primaryCarePhysicianPhone:
        readNullableString(payload.facilityPhysician, "primaryCarePhysicianPhone") ??
        readNullableString(payload.facility, "primaryCarePhysicianPhone"),
      npi:
        readNullableString(payload.facilityPhysician, "npi") ??
        readNullableString(payload.facility, "npi"),
      taxId:
        readNullableString(payload.facilityPhysician, "taxId") ??
        readNullableString(payload.facility, "taxId"),
      ptan:
        readNullableString(payload.facilityPhysician, "ptan") ??
        readNullableString(payload.facility, "ptan"),
      medicaidNumber:
        readNullableString(payload.facilityPhysician, "medicaidNumber") ??
        readNullableString(payload.facility, "medicaidNumber"),
      phone:
        readNullableString(payload.facilityPhysician, "phone") ??
        readNullableString(payload.facility, "phone"),
      fax:
        readNullableString(payload.facilityPhysician, "fax") ??
        readNullableString(payload.facility, "fax"),
      accountNumber:
        readNullableString(payload.facilityPhysician, "accountNumber") ??
        readNullableString(payload.facility, "accountNumber"),
      placeOfService:
        readStringArray(facilitySource, "placeOfService").length > 0
          ? readStringArray(facilitySource, "placeOfService")
          : readStringArray(payload.facility, "placeOfService"),
    },
    patient: {
      patientName: payload.patient.patientName,
      patientDob: payload.patient.patientDob ?? null,
      patientAddress: payload.patient.patientAddress ?? null,
      patientCityStateZip: payload.patient.patientCityStateZip ?? null,
      inSkilledNursingFacility: payload.patient.inSkilledNursingFacility ?? null,
      inSurgicalGlobalPeriod: payload.patient.inSurgicalGlobalPeriod ?? null,
    },
    insurance: {
      primary: {
        payerName: readNullableString(primaryInsurance, "payerName"),
        facilityName: readNullableString(primaryInsurance, "facilityName"),
        policyNumber: readNullableString(primaryInsurance, "policyNumber"),
        payerPhone: readNullableString(primaryInsurance, "payerPhone"),
        facilityInNetwork: readNullableString(primaryInsurance, "facilityInNetwork"),
        providerInNetwork: readNullableString(primaryInsurance, "providerInNetwork"),
      },
      secondary: {
        payerName: readNullableString(secondaryInsurance, "payerName"),
        facilityName: readNullableString(secondaryInsurance, "facilityName"),
        policyNumber: readNullableString(secondaryInsurance, "policyNumber"),
        payerPhone: readNullableString(secondaryInsurance, "payerPhone"),
        facilityInNetwork: readNullableString(secondaryInsurance, "facilityInNetwork"),
        providerInNetwork: readNullableString(secondaryInsurance, "providerInNetwork"),
      },
      workersCompOrVACaseManager: payload.insurance?.workersCompOrVACaseManager ?? null,
    },
    products: {
      selected: payload.products.selected,
      attemptAuthorizationIfNotCovered: payload.products.attemptAuthorizationIfNotCovered,
    },
    testResults: payload.testResults,
    diagnosis: payload.diagnosis,
    wounds: {
      woundTypes: payload.wounds.woundTypes,
      wound1: payload.wounds.wound1,
      wound2: payload.wounds.wound2,
    },
    authorization: {
      authorizedSignature: payload.authorization.authorizedSignature ?? null,
      signatureDate: payload.authorization.signatureDate ?? null,
      consentConfirmed: payload.authorization.consentConfirmed,
    },
    meta: {
      formVersion: payload.meta?.formVersion ?? "AWB-IVR-v1",
      generatedAt: payload.meta?.generatedAt ?? new Date().toISOString(),
    },
  };
}

function validateIvrInsurancePayload(payload: NormalizedIvrInsurancePayload): string[] {
  const errors: string[] = [];

  if (!payload.requestSetup.salesExecutive) {
    errors.push("requestSetup.salesExecutive is required.");
  }
  if (!payload.requestSetup.requestType) {
    errors.push("requestSetup.requestType is required.");
  }
  if (!payload.facilityPhysician.physicianName) {
    errors.push("facilityPhysician.physicianName is required.");
  }
  if (!payload.facilityPhysician.facilityName) {
    errors.push("facilityPhysician.facilityName is required.");
  }
  if (!payload.facilityPhysician.facilityAddress) {
    errors.push("facilityPhysician.facilityAddress is required.");
  }
  if (!payload.facilityPhysician.facilityCityStateZip) {
    errors.push("facilityPhysician.facilityCityStateZip is required.");
  }
  if (!payload.facilityPhysician.phone) {
    errors.push("facilityPhysician.phone is required.");
  }
  if (payload.facilityPhysician.placeOfService.length === 0) {
    errors.push("facilityPhysician.placeOfService must include at least one value.");
  }
  if (!payload.patient.patientName) {
    errors.push("patient.patientName is required.");
  }
  if (!payload.insurance.primary.payerName) {
    errors.push("insurance.primary.payerName is required.");
  }
  if (!payload.insurance.primary.policyNumber) {
    errors.push("insurance.primary.policyNumber is required.");
  }
  if (!payload.authorization.authorizedSignature) {
    errors.push("authorization.authorizedSignature is required.");
  }
  if (!payload.authorization.signatureDate) {
    errors.push("authorization.signatureDate is required.");
  }
  if (payload.authorization.consentConfirmed !== true) {
    errors.push("authorization.consentConfirmed must be true.");
  }

  return errors;
}

function readNullableString(
  source: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = source?.[key];
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readStringArray(
  source: Record<string, unknown> | undefined,
  key: string,
): string[] {
  const value = source?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveSiteTypeFromPos(posValues: string[]): SiteType {
  const normalized = posValues.map((value) => value.toLowerCase());

  if (normalized.some((value) => value.includes("skilled") || value.includes("snf"))) {
    return "SNF";
  }
  if (normalized.some((value) => value.includes("nursing home") || value === "nh")) {
    return "NH";
  }
  if (normalized.some((value) => value.includes("alf") || value.includes("assisted"))) {
    return "ALF";
  }
  if (normalized.some((value) => value.includes("adult senior care"))) {
    return "Adult Senior Care";
  }
  if (normalized.some((value) => value.includes("asc"))) {
    return "ASC";
  }
  if (normalized.some((value) => value.includes("ortho"))) {
    return "Ortho";
  }

  return "Clinic";
}

function resolveWoundTypeFromSelection(woundTypes: string[]): WoundType {
  const normalized = woundTypes.map((value) => value.toLowerCase());

  if (normalized.some((value) => value.includes("diabetic") || value.includes("dfu"))) {
    return "DFU";
  }
  if (normalized.some((value) => value.includes("venous") || value.includes("vlu"))) {
    return "VLU";
  }
  if (normalized.some((value) => value.includes("pressure"))) {
    return "Pressure";
  }
  if (normalized.some((value) => value.includes("surgical"))) {
    return "Surgical";
  }
  if (normalized.some((value) => value.includes("trauma"))) {
    return "Trauma";
  }

  return "Other";
}

function resolveRequestTypeFromProducts(products: string[]): RequestType {
  const normalized = products.map((value) => value.toLowerCase());

  if (normalized.some((value) => value.includes("training"))) {
    return "Training";
  }
  if (normalized.some((value) => value.includes("billing"))) {
    return "Billing";
  }
  if (normalized.some((value) => value.includes("supply"))) {
    return "Supplies";
  }
  if (
    normalized.some(
      (value) =>
        value.includes("graft") ||
        value.includes("ctp") ||
        value.includes("apligraf") ||
        value.includes("dermagraft"),
    )
  ) {
    return "Graft inquiry";
  }

  return "Consult";
}

function resolveRequestType(requestTypeRaw: string | null, products: string[]): RequestType {
  const normalizedRequest = requestTypeRaw?.trim().toLowerCase() ?? "";

  if (normalizedRequest.includes("benefit")) {
    return "Billing";
  }
  if (normalizedRequest.includes("training")) {
    return "Training";
  }

  return resolveRequestTypeFromProducts(products);
}

function buildIvrSummaryNotes(payload: NormalizedIvrInsurancePayload): string {
  const preview = {
    formVersion: payload.meta.formVersion,
    salesExecutive: payload.requestSetup.salesExecutive,
    requestType: payload.requestSetup.requestType,
    physicianName: payload.facilityPhysician.physicianName,
    physicianSpecialty: payload.facilityPhysician.physicianSpecialty,
    facilityName: payload.facilityPhysician.facilityName,
    contactName: payload.facilityPhysician.contactName,
    patientName: payload.patient.patientName,
    patientDob: payload.patient.patientDob ?? null,
    primaryPayerName: payload.insurance.primary.payerName,
    products: payload.products.selected,
    woundTypes: payload.wounds.woundTypes,
    consentConfirmed: payload.authorization.consentConfirmed,
    generatedAt: payload.meta.generatedAt,
  };

  return JSON.stringify(preview);
}

function buildCaseId(): string {
  return `CASE-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(
    Math.random() * 9000 + 1000,
  )}`;
}

export async function startServer() {
  await initializeDatabase();
  await ensureMediaStorageDirectories();
  await ensureDemoCatalogAndQuestions();
  await query(
    `
      update video_generation_jobs
      set status = 'queued',
          started_at = null,
          completed_at = null,
          error_message = coalesce(error_message, 'Server restarted before completion.')
      where status in ('processing', 'rendering', 'uploading')
        and completed_at is null
    `,
  );
  const pendingJobs = await query<{ job_id: string }>(
    `
      select job_id
      from video_generation_jobs
      where status = 'queued'
      order by created_at asc
      limit 20
    `,
  );
  pendingJobs.forEach((job) => {
    queueVideoGeneration(job.job_id);
  });
  const smartsheetStartup = await getSmartsheetHealthReport();
  await recordSyncRun("startup", smartsheetStartup.ok ? "success" : "warning", {
    env: apiEnv.APP_ENV,
    version: apiEnv.APP_VERSION,
    smartsheetConfigured: smartsheetStartup.configured,
    smartsheetRequired: smartsheetStartup.required,
    missingKeys: smartsheetStartup.missingKeys,
    sheetChecks: smartsheetStartup.sheetChecks,
  });
  console.log(
    `[startup] Smartsheet required=${smartsheetStartup.required} configured=${smartsheetStartup.configured} ok=${smartsheetStartup.ok}`,
  );
  if (smartsheetStartup.missingKeys.length > 0) {
    console.warn(
      `[startup] Missing Smartsheet keys: ${smartsheetStartup.missingKeys.join(", ")}`,
    );
  }

  cron.schedule(apiEnv.NIGHTLY_SYNC_CRON, async () => {
    try {
      await syncContent("nightly");
    } catch (error) {
      await recordSyncRun("nightly", "warning", {
        error: error instanceof Error ? error.message : "Nightly sync failed",
      });
    }
  });

  app.listen(apiEnv.PORT, () => {
    console.log(`AWB API listening on port ${apiEnv.PORT}`);
  });
}

if (require.main === module) {
  void startServer();
}

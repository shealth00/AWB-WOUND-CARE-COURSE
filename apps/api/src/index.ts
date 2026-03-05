import { randomUUID } from "node:crypto";
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
  generateCertificateId,
  gradeQuiz,
  normalizeTrackKey,
  routeIvr,
  splitList,
  type QuizSubmissionAnswer,
} from "@awb/lms-core";
import { PROGRAM_CATALOG, PROGRAM_TRACKS } from "@awb/lms-core/program";
import { z } from "zod";
import { apiEnv } from "./env.js";
import { assertShareRole, getAdminIdentity, issueAdminToken, requireAdmin } from "./lib/auth.js";
import { buildCertificatePresentation } from "./lib/certificates.js";
import { buildCertificateHtml, resolveCertificateTemplateDefaults } from "./lib/certificateTemplate.js";
import { initializeDatabase, insertAuditLog, insertVerificationLookup, query, recordSyncRun } from "./lib/db.js";
import { ensureDemoCatalogAndQuestions, resetOperationalData } from "./lib/demoSeed.js";
import { canAccessCertificatePdf, renderPdfFromHtml } from "./lib/pdf.js";
import { uploadCertificatePdf } from "./lib/pdfStorage.js";
import { createWebhookFromEnv, addRowByColumnTitle, attachFileToRow, attachLinkToRow, shareSheet, smartsheetIds } from "./lib/smartsheet.js";
import { getLesson, listLessonsByTrack, listTracks, syncContent } from "./lib/sync.js";
import { enforceVerifyRateLimit, getDisplayLearnerName } from "./lib/verify.js";

export const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 5,
    fileSize: 20 * 1024 * 1024,
  },
});

app.use(express.json({ limit: "2mb" }));

app.get("/health", async (_req, res) => {
  const [latestSync] = await query<{ created_at: string; status: string }>(
    `select created_at, status from sync_runs order by created_at desc limit 1`,
  );

  res.json({
    ok: true,
    service: "api",
    environment: apiEnv.APP_ENV,
    baseUrl: apiEnv.BASE_URL,
    latestSync: latestSync ?? null,
    timestamp: new Date().toISOString(),
  });
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

app.get(["/catalog", "/api/catalog"], async (req, res) => {
  const track = typeof req.query.track === "string" ? req.query.track : undefined;
  const [tracks, lessons] = await Promise.all([listTracks(), listLessonsByTrack(track)]);

  res.json({
    tracks,
    lessons,
  });
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
    n: z.coerce.number().int().positive().max(50).default(10),
  });

  const parseResult = schema.safeParse(req.query);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const { track, moduleId, n } = parseResult.data;
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
      where track = $1 and module_id = $2 and active = true
    `,
    [track, moduleId],
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
    Math.min(n, questions.length),
  );
  const selectedIds = new Set(selected.map((question) => question.id));

  res.json({
    track,
    moduleId,
    passingScore: PASSING_SCORE,
    questions: questions.filter((question) => selectedIds.has(question.id)),
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
  const normalizedTrackInput = payload.track.toLowerCase();
  const trackMeta =
    PROGRAM_TRACKS.find(
      (track) =>
        track.id === payload.track ||
        track.title.toLowerCase() === normalizedTrackInput ||
        track.catalogName.toLowerCase() === normalizedTrackInput ||
        normalizedTrackInput.includes(track.code.toLowerCase()),
    ) ?? null;
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
      where track = $1 and module_id = $2 and id::text = any($3::text[])
    `,
    [payload.track, payload.moduleId, questionIds],
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
  const shouldIssueCertificate =
    grade.pass && (payload.isFinalExam ?? payload.moduleId.toLowerCase().includes("final"));
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
      "Post-op Protocol",
      "Weekly Wound Rounds Checklist",
      "Pressure Injury Prevention Bundle",
      "Post-Op Graft Care Protocol",
    ]),
    siteType: z.enum(ALLOWED_SITE_TYPES),
    facilityName: z.string().min(1),
    caseId: z.string().min(1),
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
      CaseId: payload.caseId,
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
      payload.caseId,
      payload.status,
      payload.assignedTo ?? null,
      payload.notes ?? null,
      JSON.stringify(attachments),
      smartsheetRowId,
    ],
  );

  res.status(201).json({
    submissionId,
    status: payload.status,
    attachments,
    smartsheetSynced,
  });
});

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

function getRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export async function startServer() {
  await initializeDatabase();
  await ensureDemoCatalogAndQuestions();

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

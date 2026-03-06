import {
  PROGRAM_CATALOG,
  PROGRAM_TRACKS,
  type ProgramModule,
} from "@awb/lms-core/program";
import { query } from "./db.js";

const DEMO_VIDEO_URLS = Array.from({ length: 12 }, (_, index) => `/videos/V${String(index + 1).padStart(2, "0")}.mp4`);

const DOWNLOAD_URLS: Record<string, string> = {
  "wound visit documentation template": "/downloads/awb-assessment-sample-note.pdf",
  "photo protocol one-pager": "/downloads/awb-wound-documentation-pack.pdf",
  "plan of care template": "/downloads/awb-wound-documentation-pack.pdf",
  "awb wound documentation pack": "/downloads/awb-wound-documentation-pack.pdf",
  "awb weekly wound rounds checklist": "/downloads/awb-requirements-clinical-note-review.pdf",
  "awb pressure injury prevention bundle": "/downloads/awb-requirements-clinical-note-review.pdf",
  "awb escalation packet checklist": "/downloads/awb-requirements-clinical-note-review.pdf",
  "awb post-op graft care protocol": "/downloads/awb-graft-application-sample-note.pdf",
};

interface DemoSeedSummary {
  seededLessons: number;
  seededQuestions: number;
}

export async function ensureDemoCatalogAndQuestions(): Promise<DemoSeedSummary> {
  const [lessonCountRow] = await query<{ count: string }>("select count(*)::text as count from content_lessons");
  const [questionCountRow] = await query<{ count: string }>("select count(*)::text as count from question_bank");

  const lessonCount = Number(lessonCountRow?.count ?? "0");
  const questionCount = Number(questionCountRow?.count ?? "0");
  let seededLessons = 0;
  let seededQuestions = 0;

  if (lessonCount === 0) {
    const lessonRows = buildDemoLessonRows();

    for (const row of lessonRows) {
      await query(
        `
          insert into content_lessons (
            lesson_id, source_row_id, track, module_id, module_title, lesson_title, video_url, duration_min,
            objectives, downloads, publish_status, version, owner
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, 'Published', '1.0', 'AWB Academy')
        `,
        [
          row.lessonId,
          null,
          row.track,
          row.moduleId,
          row.moduleTitle,
          row.lessonTitle,
          row.videoUrl,
          row.durationMin,
          JSON.stringify(row.objectives),
          JSON.stringify(row.downloads),
        ],
      );
    }

    seededLessons = lessonRows.length;
  }

  if (questionCount === 0) {
    const questionRows = buildDemoQuestionRows();

    for (const row of questionRows) {
      await query(
        `
          insert into question_bank (
            source_row_id, track, module_id, difficulty, question_type, stem,
            options, correct_answer, rationale, tags, active, version
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb, true, '1.0')
        `,
        [
          row.sourceRowId,
          row.track,
          row.moduleId,
          row.difficulty,
          row.questionType,
          row.stem,
          JSON.stringify(row.options),
          row.correctAnswer,
          row.rationale,
          JSON.stringify(row.tags),
        ],
      );
    }

    seededQuestions = questionRows.length;
  }

  return {
    seededLessons,
    seededQuestions,
  };
}

export async function resetOperationalData(clearCatalog = false): Promise<void> {
  await query(`delete from verification_lookups`);
  await query(`delete from practical_assignments`);
  await query(`delete from lesson_progress`);
  await query(`delete from webhook_events`);
  await query(`delete from ivr_intakes`);
  await query(`delete from form_submissions`);
  await query(`delete from certificates`);
  await query(`delete from quiz_attempts`);
  await query(`delete from sync_runs`);

  if (clearCatalog) {
    await query(`delete from question_bank`);
    await query(`delete from content_lessons`);
  }
}

function buildDemoLessonRows() {
  const rows: Array<{
    lessonId: string;
    track: string;
    moduleId: string;
    moduleTitle: string;
    lessonTitle: string;
    videoUrl: string;
    durationMin: number;
    objectives: string[];
    downloads: string[];
  }> = [];
  let videoIndex = 0;

  for (const module of PROGRAM_CATALOG.sharedCore) {
    for (const lesson of module.lessons) {
      rows.push({
        lessonId: lesson.id,
        track: "Shared Core",
        moduleId: module.id,
        moduleTitle: module.title,
        lessonTitle: lesson.title,
        videoUrl: DEMO_VIDEO_URLS[videoIndex % DEMO_VIDEO_URLS.length]!,
        durationMin: lesson.durationMin,
        objectives: lesson.objectives.length > 0 ? lesson.objectives.slice(0, 3) : module.outcomes.slice(0, 3),
        downloads: normalizeDownloads(module.downloads),
      });
      videoIndex += 1;
    }
  }

  for (const trackMeta of PROGRAM_TRACKS) {
    const modules = PROGRAM_CATALOG.trackModules[trackMeta.id];

    for (const module of modules) {
      for (const lesson of module.lessons) {
        rows.push({
          lessonId: lesson.id,
          track: trackMeta.title,
          moduleId: module.id,
          moduleTitle: module.title,
          lessonTitle: lesson.title,
          videoUrl: DEMO_VIDEO_URLS[videoIndex % DEMO_VIDEO_URLS.length]!,
          durationMin: lesson.durationMin,
          objectives: lesson.objectives.length > 0 ? lesson.objectives.slice(0, 3) : mergeObjectives(module),
          downloads: normalizeDownloads(module.downloads),
        });
        videoIndex += 1;
      }
    }
  }

  return rows;
}

function buildDemoQuestionRows() {
  const modules = [
    ...PROGRAM_CATALOG.sharedCore.map((module) => ({ module, track: "Shared Core" })),
    ...PROGRAM_TRACKS.flatMap((trackMeta) =>
      PROGRAM_CATALOG.trackModules[trackMeta.id].map((module) => ({
        module,
        track: trackMeta.title,
      })),
    ),
  ];

  const moduleQuestions = modules.flatMap(({ module, track }) => {
    const key = slug(`${track}-${module.id}`);

    return [
      {
        sourceRowId: `seed-${key}-1`,
        track,
        moduleId: module.id,
        difficulty: 2,
        questionType: "MCQ",
        stem: `${module.title}: Which documentation element is consistently required for audit-ready medical necessity support?`,
        options: [
          { key: "A", value: "Serial wound measurements with trend documentation" },
          { key: "B", value: "Preferred product brand only" },
          { key: "C", value: "Facility parking details" },
          { key: "D", value: "Marketing summary notes" },
        ],
        correctAnswer: "A",
        rationale:
          "Objective, serial measurements with trend review are foundational to LCD-aligned medical necessity records.",
        tags: ["documentation", "medical-necessity", slug(track)],
      },
      {
        sourceRowId: `seed-${key}-2`,
        track,
        moduleId: module.id,
        difficulty: 3,
        questionType: "Multi",
        stem: `${module.title}: Select all elements that strengthen claim defensibility.`,
        options: [
          { key: "A", value: "Infection status with intervention plan" },
          { key: "B", value: "Standard-of-care adherence details" },
          { key: "C", value: "Trending outcomes over time" },
          { key: "D", value: "Non-clinical promotional language" },
        ],
        correctAnswer: "A,B,C",
        rationale:
          "Defensible records combine infection context, adherence documentation, and objective trend outcomes.",
        tags: ["quality", "audit-readiness", slug(track)],
      },
      {
        sourceRowId: `seed-${key}-3`,
        track,
        moduleId: module.id,
        difficulty: 2,
        questionType: "Case",
        stem: `${module.title}: A wound has stalled after standard care. What is the next best documentation step?`,
        options: [
          { key: "A", value: "Escalate with objective trend data and rationale for advanced modalities" },
          { key: "B", value: "Skip progress data and submit immediately" },
          { key: "C", value: "Use only verbal handoff notes" },
          { key: "D", value: "Document product name without baseline" },
        ],
        correctAnswer: "A",
        rationale:
          "Escalation requires objective trend evidence, failed conservative-care context, and explicit clinical rationale.",
        tags: ["escalation", "ctps", slug(track)],
      },
    ];
  });

  const finalExamQuestions = PROGRAM_TRACKS.flatMap((trackMeta) => {
    const key = slug(`${trackMeta.title}-FINAL`);
    const track = trackMeta.title;

    return [
      {
        sourceRowId: `seed-${key}-1`,
        track,
        moduleId: "FINAL",
        difficulty: 3,
        questionType: "MCQ",
        stem: `${trackMeta.title}: Which final-exam evidence pattern most strongly supports escalation to advanced modalities?`,
        options: [
          { key: "A", value: "Single narrative note with no baseline metrics" },
          { key: "B", value: "Serial objective measurements plus failed conservative-care timeline" },
          { key: "C", value: "Product preference list only" },
          { key: "D", value: "Billing code list without wound progression context" },
        ],
        correctAnswer: "B",
        rationale:
          "Final-exam readiness requires objective trend evidence and documented conservative-care failure before escalation.",
        tags: ["final", "medical-necessity", slug(track)],
      },
      {
        sourceRowId: `seed-${key}-2`,
        track,
        moduleId: "FINAL",
        difficulty: 3,
        questionType: "Multi",
        stem: `${trackMeta.title}: Select all final-exam elements expected in an audit-defensible note set.`,
        options: [
          { key: "A", value: "Serial measurements and trend interpretation" },
          { key: "B", value: "Etiology-specific standard-of-care documentation" },
          { key: "C", value: "Escalation rationale and follow-up plan" },
          { key: "D", value: "General statement that wound is better" },
        ],
        correctAnswer: "A,B,C",
        rationale:
          "Defensible final-exam patterns require objective measures, standard-care detail, and escalation rationale.",
        tags: ["final", "audit-readiness", slug(track)],
      },
      {
        sourceRowId: `seed-${key}-3`,
        track,
        moduleId: "FINAL",
        difficulty: 2,
        questionType: "Case",
        stem: `${trackMeta.title}: A record shows complete lessons but inconsistent trend data. What should happen before certification?`,
        options: [
          { key: "A", value: "Issue certificate immediately if attendance is complete" },
          { key: "B", value: "Require final exam pass and complete trend documentation checks" },
          { key: "C", value: "Skip final exam because module quizzes were attempted" },
          { key: "D", value: "Approve based only on verbal handoff" },
        ],
        correctAnswer: "B",
        rationale:
          "Certification requires final exam pass and defensible documentation standards, not attendance alone.",
        tags: ["final", "certificate", slug(track)],
      },
    ];
  });

  return [...moduleQuestions, ...finalExamQuestions];
}

function normalizeDownloads(downloads: string[] | undefined): string[] {
  if (!downloads || downloads.length === 0) {
    return ["/downloads/awb-wound-documentation-pack.pdf"];
  }

  return downloads.map((download) => {
    if (/^https?:\/\//i.test(download) || download.startsWith("/")) {
      return download;
    }

    return DOWNLOAD_URLS[download.trim().toLowerCase()] ?? "/downloads/awb-wound-documentation-pack.pdf";
  });
}

function mergeObjectives(module: ProgramModule): string[] {
  if (module.outcomes.length > 0) {
    return module.outcomes.slice(0, 3);
  }

  return ["Document, measure, trend, and escalate using AWB workflows."];
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

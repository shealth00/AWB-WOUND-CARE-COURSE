import { splitList } from "@awb/lms-core";
import type { PoolClient } from "pg";
import { query, recordSyncRun, withTransaction } from "./db.js";
import { getSheet, sheetRowToObject, smartsheetIds } from "./smartsheet.js";

export interface SyncSummary {
  catalogCount: number;
  questionCount: number;
}

export async function syncContent(source: string): Promise<SyncSummary> {
  const [catalogSheet, questionSheet] = await Promise.all([
    getSheet(smartsheetIds.catalog),
    getSheet(smartsheetIds.questionBank),
  ]);

  const catalogRows = sheetRowToObject(catalogSheet)
    .filter((row) => (row.PublishStatus ?? "").toLowerCase() === "published")
    .map((row) => ({
      lessonId: row.LessonId,
      track: row.Track,
      moduleId: row.ModuleId,
      moduleTitle: row.ModuleTitle,
      lessonTitle: row.LessonTitle,
      videoUrl: row.VideoUrl || null,
      durationMin: row.DurationMin ? Number(row.DurationMin) : null,
      objectives: splitList(row.Objectives),
      downloads: splitList(row.Downloads),
      publishStatus: row.PublishStatus || "Draft",
      version: row.Version || null,
      owner: row.Owner || null,
    }))
    .filter((row) => row.lessonId && row.track && row.moduleId && row.moduleTitle && row.lessonTitle);

  const questionRows = sheetRowToObject(questionSheet)
    .filter((row) => (row.Active ?? "").toUpperCase() === "Y")
    .map((row) => ({
      sourceRowId: row._rowId,
      track: row.Track,
      moduleId: row.ModuleId,
      difficulty: row.Difficulty ? Number(row.Difficulty) : 1,
      questionType: row.Type || "MCQ",
      stem: row.Stem,
      options: [
        row.A ? { key: "A", value: row.A } : null,
        row.B ? { key: "B", value: row.B } : null,
        row.C ? { key: "C", value: row.C } : null,
        row.D ? { key: "D", value: row.D } : null,
        row.E ? { key: "E", value: row.E } : null,
      ].filter(isOption),
      correctAnswer: row.Correct,
      rationale: row.Rationale || null,
      tags: splitList(row.Tags),
      active: true,
      version: row.Version || null,
    }))
    .filter((row) => row.track && row.moduleId && row.stem && row.correctAnswer);

  await withTransaction(async (client) => {
    await client.query("delete from content_lessons");
    await client.query("delete from question_bank");

    for (const row of catalogRows) {
      await insertCatalogRow(client, row);
    }

    for (const row of questionRows) {
      await insertQuestionRow(client, row);
    }
  });

  const summary = {
    catalogCount: catalogRows.length,
    questionCount: questionRows.length,
  };

  await recordSyncRun(source, "success", summary);
  return summary;
}

export async function listTracks() {
  return query<{
    track: string;
    module_id: string;
    module_title: string;
    lesson_count: string;
  }>(
    `
      select track, module_id, module_title, count(*)::text as lesson_count
      from content_lessons
      group by track, module_id, module_title
      order by track asc, module_title asc
    `,
  );
}

export async function listLessonsByTrack(track?: string) {
  return query<{
    lesson_id: string;
    track: string;
    module_id: string;
    module_title: string;
    lesson_title: string;
    video_url: string | null;
    duration_min: number | null;
    objectives: string[];
    downloads: string[];
    publish_status: string;
    version: string | null;
    owner: string | null;
  }>(
    `
      select lesson_id, track, module_id, module_title, lesson_title, video_url, duration_min,
        objectives, downloads, publish_status, version, owner
      from content_lessons
      where ($1::text is null or track = $1)
      order by track asc, module_id asc, lesson_title asc
    `,
    [track ?? null],
  );
}

export async function getLesson(lessonId: string) {
  const rows = await query<{
    lesson_id: string;
    track: string;
    module_id: string;
    module_title: string;
    lesson_title: string;
    video_url: string | null;
    duration_min: number | null;
    objectives: string[];
    downloads: string[];
    publish_status: string;
    version: string | null;
    owner: string | null;
  }>(
    `
      select lesson_id, track, module_id, module_title, lesson_title, video_url, duration_min,
        objectives, downloads, publish_status, version, owner
      from content_lessons
      where lesson_id = $1
      limit 1
    `,
    [lessonId],
  );

  return rows[0] ?? null;
}

async function insertCatalogRow(
  client: PoolClient,
  row: {
    lessonId: string;
    track: string;
    moduleId: string;
    moduleTitle: string;
    lessonTitle: string;
    videoUrl: string | null;
    durationMin: number | null;
    objectives: string[];
    downloads: string[];
    publishStatus: string;
    version: string | null;
    owner: string | null;
  },
) {
  await client.query(
    `
      insert into content_lessons (
        lesson_id, track, module_id, module_title, lesson_title, video_url, duration_min,
        objectives, downloads, publish_status, version, owner
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12)
    `,
    [
      row.lessonId,
      row.track,
      row.moduleId,
      row.moduleTitle,
      row.lessonTitle,
      row.videoUrl,
      row.durationMin,
      JSON.stringify(row.objectives),
      JSON.stringify(row.downloads),
      row.publishStatus,
      row.version,
      row.owner,
    ],
  );
}

function isOption(
  value: { key: string; value: string } | null,
): value is { key: string; value: string } {
  return value !== null;
}

async function insertQuestionRow(
  client: PoolClient,
  row: {
    sourceRowId: string;
    track: string;
    moduleId: string;
    difficulty: number;
    questionType: string;
    stem: string;
    options: Array<{ key: string; value: string }>;
    correctAnswer: string;
    rationale: string | null;
    tags: string[];
    active: boolean;
    version: string | null;
  },
) {
  await client.query(
    `
      insert into question_bank (
        source_row_id, track, module_id, difficulty, question_type, stem, options,
        correct_answer, rationale, tags, active, version
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb, $11, $12)
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
      row.active,
      row.version,
    ],
  );
}

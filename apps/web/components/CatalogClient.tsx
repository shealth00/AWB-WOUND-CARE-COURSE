"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../src/api";

interface CatalogResponse {
  tracks: Array<{
    track: string;
    module_id: string;
    module_title: string;
    lesson_count: string;
  }>;
  lessons: Array<{
    lesson_id: string;
    track: string;
    module_id: string;
    module_title: string;
    lesson_title: string;
    duration_min: number | null;
    owner: string | null;
  }>;
}

interface ProgramCatalogResponse {
  portability: {
    scorm: string[];
    xapi: boolean;
  };
  latestLcdHandling: {
    strategy: string;
    requiredSkills: string[];
  };
  certificateRequirements: Array<{
    id: string;
    description: string;
  }>;
  tracks: Array<{
    id: string;
    code: string;
    title: string;
    catalogName: string;
    certificateTitle: string;
    estimatedHours: string;
    outcomes: string[];
    moduleCount: number;
    finalExamQuestions: number;
    passScore: number;
    requiresPracticalAssignment: boolean;
  }>;
  sharedCore: Array<{
    id: string;
    title: string;
    summary: string;
    lessons: Array<{ id: string; title: string; durationMin: number; format: string }>;
  }>;
  toolLibrary: Array<{
    id: string;
    title: string;
    audience: string;
    summary: string;
    downloadUrl: string;
    formRoute: string;
    printFriendly: boolean;
  }>;
  documentationPack: {
    title: string;
    summary: string;
    downloadUrl: string;
    sourceReferences: string[];
    fieldGroups: Array<{
      id: string;
      title: string;
      fields: string[];
    }>;
  };
}

export function CatalogClient() {
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [program, setProgram] = useState<ProgramCatalogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch(apiUrl("/catalog")).then((response) => response.json() as Promise<CatalogResponse>),
      fetch(apiUrl("/program/catalog")).then((response) =>
        response.json() as Promise<ProgramCatalogResponse>,
      ),
    ])
      .then(([catalogPayload, programPayload]) => {
        setData(catalogPayload);
        setProgram(programPayload);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Failed to load catalog."),
      );
  }, []);

  if (error) {
    return <div className="card status-bad">{error}</div>;
  }

  if (!data || !program) {
    return <div className="card">Loading catalog...</div>;
  }

  return (
    <div className="grid">
      <div className="card">
        <h2>Five LMS-ready learning paths</h2>
        <div className="split">
          {program.tracks.map((track) => (
            <article className="question" key={track.id}>
              <div className="pill">{track.code}</div>
              <h3>{track.catalogName}</h3>
              <div className="muted">{track.title}</div>
              <p className="muted">
                {track.moduleCount} modules / {track.estimatedHours} / final exam {track.finalExamQuestions} questions /
                pass {track.passScore}%.
              </p>
              <div className="stack">
                {track.outcomes.map((outcome) => (
                  <div key={outcome}>{outcome}</div>
                ))}
              </div>
              {track.requiresPracticalAssignment ? (
                <p className="status-warn">Includes required practical assignment.</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
      <div className="split">
        <div className="card">
          <h2>Shared core</h2>
          <div className="stack">
            {program.sharedCore.map((module) => (
              <div className="question" key={module.id}>
                <strong>{module.title}</strong>
                <div className="muted">{module.summary}</div>
                <div className="muted">
                  {module.lessons.length} lessons /{" "}
                  {module.lessons.reduce((total, lesson) => total + lesson.durationMin, 0)} minutes
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>Portability and completion rules</h2>
          <p className="muted">
            Packaging target: {program.portability.scorm.join(", ")} and{" "}
            {program.portability.xapi ? "xAPI compatible." : "xAPI not enabled."}
          </p>
          <div className="stack">
            {program.certificateRequirements.map((requirement) => (
              <div className="question" key={requirement.id}>
                {requirement.description}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="split">
        <div className="card">
          <h2>{program.documentationPack.title}</h2>
          <p className="muted">{program.documentationPack.summary}</p>
          <div className="actions">
            <a className="button" href={program.documentationPack.downloadUrl}>
              Download pack
            </a>
            <a className="button secondary" href="/forms">
              Open web forms
            </a>
          </div>
          <div className="stack" style={{ marginTop: 16 }}>
            {program.documentationPack.fieldGroups.map((group) => (
              <div className="question" key={group.id}>
                <strong>{group.title}</strong>
                <div className="muted">{group.fields.join(" / ")}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>AWB tools library</h2>
          <div className="stack">
            {program.toolLibrary.map((tool) => (
              <div className="question" key={tool.id}>
                <strong>{tool.title}</strong>
                <div className="muted">{tool.summary}</div>
                <div className="actions">
                  <a className="button" href={tool.downloadUrl}>
                    Download
                  </a>
                  <a className="button secondary" href={tool.formRoute}>
                    Web form
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="split">
        {data.tracks.map((track) => (
          <article className="card" key={`${track.track}-${track.module_id}`}>
            <div className="pill">{track.track}</div>
            <h2>{track.module_title}</h2>
            <p className="muted">
              Module {track.module_id} with {track.lesson_count} lesson
              {track.lesson_count === "1" ? "" : "s"}.
            </p>
            <div className="actions">
              <a className="button" href={`/quiz?track=${encodeURIComponent(track.track)}&moduleId=${encodeURIComponent(track.module_id)}`}>
                Start Quiz
              </a>
            </div>
          </article>
        ))}
      </div>
      <div className="card">
        <h2>Published lessons</h2>
        <p className="muted">
          Current training shell is driven by synced Smartsheet content; the long-form program architecture is exposed separately above.
        </p>
        <div className="stack">
          {data.lessons.map((lesson) => (
            <a className="question" href={`/lesson/${encodeURIComponent(lesson.lesson_id)}`} key={lesson.lesson_id}>
              <strong>{lesson.lesson_title}</strong>
              <div className="muted">
                {lesson.track} / {lesson.module_title}
                {lesson.duration_min ? ` / ${lesson.duration_min} min` : ""}
                {lesson.owner ? ` / Owner: ${lesson.owner}` : ""}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

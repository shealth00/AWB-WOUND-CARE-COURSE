"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "../src/http";

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

interface TrackProgressResponse {
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

export function CatalogClient() {
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [program, setProgram] = useState<ProgramCatalogResponse | null>(null);
  const [selectedTrack, setSelectedTrack] = useState("");
  const [userId, setUserId] = useState("");
  const [memberLoaded, setMemberLoaded] = useState(false);
  const [progress, setProgress] = useState<TrackProgressResponse | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchJson<{ member: { memberId: string } }>("/auth/me")
      .then((payload) => {
        setUserId(payload.member.memberId);
      })
      .catch(() => {
        setUserId("");
      })
      .finally(() => {
        setMemberLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!memberLoaded || !userId) {
      return;
    }
    void Promise.all([
      fetchJson<CatalogResponse>("/catalog"),
      fetchJson<ProgramCatalogResponse>("/program/catalog"),
    ])
      .then(([catalogPayload, programPayload]) => {
        setData(catalogPayload);
        setProgram(programPayload);
        setSelectedTrack((current) => current || programPayload.tracks[0]?.title || "");
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "API request failed while loading catalog."),
      );
  }, [memberLoaded, userId]);

  useEffect(() => {
    if (!selectedTrack || !userId) {
      return;
    }

    setProgressError(null);
    void fetchJson<TrackProgressResponse>(
      `/progress/path?userId=${encodeURIComponent(userId)}&track=${encodeURIComponent(selectedTrack)}`,
    )
      .then(setProgress)
      .catch((reason: unknown) =>
        setProgressError(
          reason instanceof Error
            ? reason.message
            : "Unable to load track progression.",
        ),
      );
  }, [selectedTrack, userId]);

  if (error) {
    return <div className="card status-bad">{error}</div>;
  }

  if (!memberLoaded) {
    return <div className="card">Loading member access...</div>;
  }

  if (!userId) {
    return (
      <div className="card status-warn">
        <strong>Member login required</strong>
        <div className="muted" style={{ marginTop: 6 }}>
          Please sign in or create an account to view the training catalog.
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <a className="button" href="/login">
            Sign in
          </a>
          <a className="button secondary" href="/register">
            Create account
          </a>
        </div>
      </div>
    );
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
        <div className="card">
          <h2>Track play-by-play</h2>
          <div className="split">
            <label className="field">
              Track
              <select
                onChange={(event) => setSelectedTrack(event.target.value)}
                value={selectedTrack}
              >
                {program.tracks.map((track) => (
                  <option key={track.id} value={track.title}>
                    {track.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Learner ID
              <input
                onChange={(event) => setUserId(event.target.value)}
                value={userId}
              />
            </label>
          </div>
          {progressError ? (
            <div className="status-bad">{progressError}</div>
          ) : null}
          {progress ? (
            <div className="stack">
              {progress.modules.map((module) => (
                <article className="question" key={module.moduleId}>
                  <div className="pill">{module.moduleId}</div>
                  <h3>{module.moduleTitle}</h3>
                  <div className="muted">
                    Lessons {module.completedLessons}/{module.totalLessons}{" "}
                    {module.quizPassed ? "/ Quiz passed" : ""}
                  </div>
                  {!module.unlocked ? (
                    <div className="status-warn">
                      Locked: Complete previous module quiz first.
                    </div>
                  ) : null}
                  {module.unlocked && !module.quizUnlocked ? (
                    <div className="status-warn">
                      {module.quizLockedReason}
                    </div>
                  ) : null}
                  <div className="actions">
                    {module.unlocked && module.firstLessonId ? (
                      <a
                        className="button secondary"
                        href={`/lesson/${encodeURIComponent(module.firstLessonId)}`}
                      >
                        Start lesson
                      </a>
                    ) : null}
                    {module.quizUnlocked ? (
                      <a
                        className="button"
                        href={`/quiz?track=${encodeURIComponent(progress.track)}&moduleId=${encodeURIComponent(module.moduleId)}&userId=${encodeURIComponent(userId)}`}
                      >
                        Take module quiz
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
              <article className="question">
                <div className="pill">FINAL</div>
                <h3>Final exam</h3>
                {progress.finalExam.unlocked ? (
                  <a
                    className="button"
                    href={`/quiz?track=${encodeURIComponent(progress.track)}&moduleId=FINAL&userId=${encodeURIComponent(userId)}`}
                  >
                    Start final exam
                  </a>
                ) : (
                  <div className="status-warn">{progress.finalExam.reason}</div>
                )}
              </article>
            </div>
          ) : (
            <div className="muted">Loading track progression...</div>
          )}
        </div>
      </div>
      <div className="card">
        <h2>Published lessons</h2>
        <p className="muted">
          Current training shell is driven by synced Smartsheet content; the long-form program architecture is exposed separately above.
        </p>
        <div className="stack">
          {data.lessons.length > 0 ? (
            data.lessons.map((lesson) => (
              <a className="question" href={`/lesson/${encodeURIComponent(lesson.lesson_id)}`} key={lesson.lesson_id}>
                <strong>{lesson.lesson_title}</strong>
                <div className="muted">
                  {lesson.track} / {lesson.module_title}
                  {lesson.duration_min ? ` / ${lesson.duration_min} min` : ""}
                  {lesson.owner ? ` / Owner: ${lesson.owner}` : ""}
                </div>
              </a>
            ))
          ) : (
            <div className="question">
              <strong>No published lessons.</strong>
              <div className="muted">
                Publish lessons in the Admin workflow, then re-run content sync.
              </div>
              <div className="actions">
                <a className="button secondary" href="/admin">
                  Open Admin
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

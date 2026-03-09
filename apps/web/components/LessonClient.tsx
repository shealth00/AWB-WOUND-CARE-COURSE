"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchJson } from "../src/http";
import { UniversalVideoPlayer } from "./UniversalVideoPlayer";

interface LessonResponse {
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
}

function resolveTrackId(trackLabel: string): string {
  const normalized = trackLabel.toLowerCase();

  if (normalized.includes("provider")) {
    return "providers";
  }

  if (normalized.includes("sales")) {
    return "sales-marketers";
  }

  if (
    normalized.includes("post-acute") ||
    normalized.includes("senior care") ||
    normalized.includes("snf") ||
    normalized.includes("nursing home") ||
    normalized.includes("alf")
  ) {
    return "post-acute-senior-care";
  }

  if (normalized.includes("asc") || normalized.includes("ortho")) {
    return "asc-ortho";
  }

  return "distributors";
}

export function LessonClient() {
  const params = useParams<{ lessonId: string }>();
  const [lesson, setLesson] = useState<LessonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string>("");

  useEffect(() => {
    void fetchJson<{ member: { memberId: string } }>("/auth/me")
      .then((payload) => setMemberId(payload.member.memberId))
      .catch(() => setMemberId(""));
  }, []);

  useEffect(() => {
    if (!params.lessonId) {
      return;
    }

    void fetchJson<LessonResponse>(`/lessons/${params.lessonId}`)
      .then(setLesson)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Failed to load lesson."),
      );
  }, [params.lessonId]);

  if (error) {
    return <div className="card status-bad">{error}</div>;
  }

  if (!lesson) {
    return <div className="card">Loading lesson...</div>;
  }

  async function markComplete() {
    if (!lesson) {
      return;
    }
    if (!memberId) {
      setProgress("Please sign in before tracking lesson progress.");
      return;
    }

    const trackId = resolveTrackId(lesson.track);

    try {
      const payload = await fetchJson<{ completed?: boolean }>("/progress/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: memberId,
          trackId,
          lessonId: lesson.lesson_id,
          watchedSeconds: (lesson.duration_min ?? 10) * 60,
          totalSeconds: (lesson.duration_min ?? 10) * 60,
        }),
      });

      setProgress(payload.completed ? "Lesson marked complete." : "Lesson progress saved below threshold.");
    } catch (reason) {
      setProgress(reason instanceof Error ? reason.message : "Progress update failed.");
    }
  }

  return (
    <div className="grid">
      <section className="hero">
        <div className="pill">{lesson.track}</div>
        <h1>{lesson.lesson_title}</h1>
        <p className="muted">
          {lesson.module_title}
          {lesson.duration_min ? ` / ${lesson.duration_min} minutes` : ""}
          {lesson.owner ? ` / Owner: ${lesson.owner}` : ""}
        </p>
        {lesson.video_url ? (
          <div className="card">
            <UniversalVideoPlayer
              mimeType="video/mp4"
              src={lesson.video_url}
              title={lesson.lesson_title}
              storageKey={lesson.lesson_id}
              resumeWindowDays={30}
            />
            <div className="actions" style={{ marginTop: 12 }}>
              <a className="button secondary" href={lesson.video_url} target="_blank" rel="noreferrer">
                Open video in new tab
              </a>
            </div>
          </div>
        ) : (
          <div className="card status-warn">No lesson video has been uploaded yet.</div>
        )}
      </section>
      <section className="split">
        <div className="card">
          <h2>Objectives</h2>
          <div className="stack">
            {lesson.objectives.length > 0 ? (
              lesson.objectives.map((objective) => <div key={objective}>{objective}</div>)
            ) : (
              <div className="muted">No objectives published.</div>
            )}
          </div>
        </div>
        <div className="card">
          <h2>Downloads</h2>
          <div className="stack">
            {lesson.downloads.length > 0 ? (
              lesson.downloads.map((download) => (
                <a className="button secondary" key={download} href={download} target="_blank" rel="noreferrer">
                  Open lesson PDF
                </a>
              ))
            ) : (
              <div className="muted">No lesson PDFs were attached.</div>
            )}
          </div>
        </div>
      </section>
      <div className="actions">
        <a
          className="button"
          href={`/quiz?track=${encodeURIComponent(lesson.track)}&moduleId=${encodeURIComponent(lesson.module_id)}`}
        >
          Take module quiz
        </a>
        <button className="button secondary" onClick={() => void markComplete()} type="button">
          Mark lesson complete
        </button>
      </div>
      {progress ? <div className="card">{progress}</div> : null}
    </div>
  );
}

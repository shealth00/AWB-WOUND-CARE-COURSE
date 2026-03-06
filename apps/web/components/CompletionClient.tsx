"use client";

import { useState } from "react";
import { fetchJson } from "../src/http";

interface CompletionResponse {
  userId: string;
  attempts: Array<{
    attempt_id: string;
    track: string;
    module_id: string;
    attempt_number: number;
    score: number;
    pass_fail: boolean;
    completed_at: string;
    certificate_id: string | null;
  }>;
}

interface TrackPathProgressResponse {
  track: string;
  trackId: string;
  modules: Array<{
    moduleId: string;
    moduleTitle: string;
    totalLessons: number;
    completedLessons: number;
    quizPassed: boolean;
  }>;
  finalExam: {
    unlocked: boolean;
    reason: string | null;
  };
}

export function CompletionClient() {
  const [userId, setUserId] = useState("demo-user");
  const [track, setTrack] = useState("Provider Track");
  const [data, setData] = useState<CompletionResponse | null>(null);
  const [path, setPath] = useState<TrackPathProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup() {
    setError(null);

    try {
      const [attemptsPayload, pathPayload] = await Promise.all([
        fetchJson<CompletionResponse>(`/completion/${encodeURIComponent(userId)}`),
        fetchJson<TrackPathProgressResponse>(
          `/progress/path?userId=${encodeURIComponent(userId)}&track=${encodeURIComponent(track)}`,
        ),
      ]);
      setData(attemptsPayload);
      setPath(pathPayload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Completion lookup failed.");
    }
  }

  return (
    <div className="grid">
      <section className="hero">
        <h1>Completion tracking</h1>
        <p className="muted">Look up a learner’s attempts and issued certificates.</p>
        <div className="actions">
          <input value={userId} onChange={(event) => setUserId(event.target.value)} />
          <input value={track} onChange={(event) => setTrack(event.target.value)} />
          <button className="button" onClick={() => void lookup()} type="button">
            Load attempts
          </button>
        </div>
      </section>

      {error ? <div className="card status-bad">{error}</div> : null}
      {data ? (
        <section className="split">
          <div className="card">
          <h2>{data.userId}</h2>
          <div className="stack">
            {data.attempts.map((attempt) => (
              <div className="question" key={attempt.attempt_id}>
                <strong>
                  {attempt.track} / {attempt.module_id}
                </strong>
                <div className="muted">
                  Attempt {attempt.attempt_number} / Score {attempt.score}% /{" "}
                  {attempt.pass_fail ? "Pass" : "Fail"}
                </div>
                {attempt.certificate_id ? (
                  <a href={`/verify/${encodeURIComponent(attempt.certificate_id)}`}>
                    {attempt.certificate_id}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
          </div>
          {path ? (
            <div className="card">
              <h2>Completion checklist</h2>
              <div className="stack">
                {path.modules.map((module) => (
                  <div className="question" key={module.moduleId}>
                    <strong>
                      {module.moduleId} / {module.moduleTitle}
                    </strong>
                    <div className="muted">
                      Lessons {module.completedLessons}/{module.totalLessons} / Quiz{" "}
                      {module.quizPassed ? "passed" : "not passed"}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                {path.finalExam.unlocked ? (
                  <div className="status-good">Eligible for final exam and certificate generation.</div>
                ) : (
                  <div className="status-warn">{path.finalExam.reason}</div>
                )}
              </div>
              {path.finalExam.unlocked ? (
                <div className="actions">
                  <a
                    className="button"
                    href={`/quiz?track=${encodeURIComponent(path.track)}&moduleId=FINAL&userId=${encodeURIComponent(userId)}`}
                  >
                    Start final exam
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

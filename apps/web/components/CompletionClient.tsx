"use client";

import { useState } from "react";
import { apiUrl } from "../src/api";

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

export function CompletionClient() {
  const [userId, setUserId] = useState("demo-user");
  const [data, setData] = useState<CompletionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup() {
    setError(null);

    try {
      const response = await fetch(apiUrl(`/completion/${encodeURIComponent(userId)}`));
      const payload = (await response.json()) as CompletionResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error ?? "Completion lookup failed." : "Completion lookup failed.");
      }

      setData(payload as CompletionResponse);
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
          <button className="button" onClick={() => void lookup()} type="button">
            Load attempts
          </button>
        </div>
      </section>

      {error ? <div className="card status-bad">{error}</div> : null}
      {data ? (
        <section className="card">
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
        </section>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "../src/http";

interface LcdUpdatesResponse {
  updates: Array<{
    id: string;
    date: string;
    title: string;
    summary: string;
    impact: string;
  }>;
  strategy: {
    strategy: string;
    requiredSkills: string[];
  };
}

export function LcdUpdatesClient() {
  const [data, setData] = useState<LcdUpdatesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchJson<LcdUpdatesResponse>("/lcd-updates")
      .then(setData)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Failed to load LCD updates."),
      );
  }, []);

  if (error) {
    return <div className="card status-bad">{error}</div>;
  }

  if (!data) {
    return <div className="card">Loading LCD update log...</div>;
  }

  return (
    <div className="grid">
      <section className="hero">
        <div className="pill">LCD update log</div>
        <h1>MAC-driven policy workflow</h1>
        <p className="muted">{data.strategy.strategy}</p>
      </section>
      <section className="split">
        <div className="card">
          <h2>Required learner skills</h2>
          <div className="stack">
            {data.strategy.requiredSkills.map((skill) => (
              <div className="question" key={skill}>
                {skill}
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>Update history</h2>
          <div className="stack">
            {data.updates.map((update) => (
              <article className="question" key={update.id}>
                <div className="pill">{update.date}</div>
                <strong>{update.title}</strong>
                <div className="muted">{update.summary}</div>
                <div>{update.impact}</div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

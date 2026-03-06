"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "../src/http";

interface ModuleLesson {
  lessonId: string;
  title: string;
  durationMinutes: number;
  objective: string;
}

interface ModulePayload {
  moduleId: string;
  title: string;
  subtitle: string;
  totalDurationMinutes: number;
  lessons: ModuleLesson[];
}

interface AuditScoreResult {
  score: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  passed: boolean;
  missingElements: string[];
}

interface AuditFormState {
  diagnosis: string;
  location: string;
  lengthCm: string;
  widthCm: string;
  depthCm: string;
  necroticTissue: string;
  procedure: string;
  tissueRemoved: string;
  postProcedureStatus: string;
  followUpPlan: string;
}

const initialForm: AuditFormState = {
  diagnosis: "",
  location: "",
  lengthCm: "",
  widthCm: "",
  depthCm: "",
  necroticTissue: "",
  procedure: "",
  tissueRemoved: "",
  postProcedureStatus: "",
  followUpPlan: "",
};

export function AuditReadyDocumentationClient() {
  const [module, setModule] = useState<ModulePayload | null>(null);
  const [form, setForm] = useState<AuditFormState>(initialForm);
  const [score, setScore] = useState<AuditScoreResult | null>(null);
  const [generatedNote, setGeneratedNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchJson<ModulePayload>("/modules/audit-ready-wound-documentation")
      .then(setModule)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Failed to load module."),
      );
  }, []);

  function updateField<K extends keyof AuditFormState>(field: K, value: AuditFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function runAudit() {
    setBusy(true);
    setError(null);

    try {
      const payload = await fetchJson<{ note: string; score: AuditScoreResult }>(
        "/tools/wound-audit/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            diagnosis: form.diagnosis,
            location: form.location,
            lengthCm: form.lengthCm ? Number(form.lengthCm) : undefined,
            widthCm: form.widthCm ? Number(form.widthCm) : undefined,
            depthCm: form.depthCm ? Number(form.depthCm) : undefined,
            necroticTissue: form.necroticTissue,
            procedure: form.procedure,
            tissueRemoved: form.tissueRemoved,
            postProcedureStatus: form.postProcedureStatus,
            followUpPlan: form.followUpPlan,
          }),
        },
      );
      setScore(payload.score);
      setGeneratedNote(payload.note);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Audit run failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid">
      <section className="hero">
        <div className="pill">Shared Core Module</div>
        <h1>Audit-Ready Wound Documentation</h1>
        <p className="muted">
          Clinical note structure that is defensible for audit and escalation.
        </p>
        <p className="muted">4 lessons / 32 minutes total.</p>
      </section>

      {module ? (
        <section className="card">
          <h2>Course path</h2>
          <div className="stack">
            {module.lessons.map((lesson) => (
              <div className="question" key={lesson.lessonId}>
                <strong>{lesson.title}</strong>
                <div className="muted">
                  {lesson.durationMinutes} minutes / {lesson.objective}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card">
        <h2>Audit-ready clinical note tool</h2>
        <div className="split">
          <label className="field">
            Diagnosis
            <input
              onChange={(event) => updateField("diagnosis", event.target.value)}
              placeholder="E11.621 / L97.412"
              value={form.diagnosis}
            />
          </label>
          <label className="field">
            Wound location
            <input
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="Right plantar forefoot"
              value={form.location}
            />
          </label>
          <label className="field">
            Length (cm)
            <input
              onChange={(event) => updateField("lengthCm", event.target.value)}
              type="number"
              value={form.lengthCm}
            />
          </label>
          <label className="field">
            Width (cm)
            <input
              onChange={(event) => updateField("widthCm", event.target.value)}
              type="number"
              value={form.widthCm}
            />
          </label>
          <label className="field">
            Depth (cm)
            <input
              onChange={(event) => updateField("depthCm", event.target.value)}
              type="number"
              value={form.depthCm}
            />
          </label>
          <label className="field">
            Necrotic tissue
            <textarea
              onChange={(event) => updateField("necroticTissue", event.target.value)}
              rows={2}
              value={form.necroticTissue}
            />
          </label>
          <label className="field">
            Procedure
            <textarea
              onChange={(event) => updateField("procedure", event.target.value)}
              rows={2}
              value={form.procedure}
            />
          </label>
          <label className="field">
            Tissue removed
            <textarea
              onChange={(event) => updateField("tissueRemoved", event.target.value)}
              rows={2}
              value={form.tissueRemoved}
            />
          </label>
          <label className="field">
            Post-procedure status
            <textarea
              onChange={(event) => updateField("postProcedureStatus", event.target.value)}
              rows={2}
              value={form.postProcedureStatus}
            />
          </label>
          <label className="field">
            Follow-up plan
            <textarea
              onChange={(event) => updateField("followUpPlan", event.target.value)}
              rows={2}
              value={form.followUpPlan}
            />
          </label>
        </div>
        <div className="actions">
          <button className="button" disabled={busy} onClick={() => void runAudit()} type="button">
            {busy ? "Running..." : "Run audit check + generate note"}
          </button>
        </div>
      </section>

      {score ? (
        <section className="card">
          <h2>Audit score</h2>
          <div className={score.passed ? "status-good" : "status-bad"}>
            Score: {score.score} / Risk: {score.risk}
          </div>
          {score.missingElements.length > 0 ? (
            <div className="muted">Missing: {score.missingElements.join(" / ")}</div>
          ) : (
            <div className="muted">All required elements documented.</div>
          )}
        </section>
      ) : null}

      {generatedNote ? (
        <section className="card">
          <h2>Generated note</h2>
          <pre className="question mono">{generatedNote}</pre>
        </section>
      ) : null}

      {error ? <div className="card status-bad">{error}</div> : null}
    </div>
  );
}

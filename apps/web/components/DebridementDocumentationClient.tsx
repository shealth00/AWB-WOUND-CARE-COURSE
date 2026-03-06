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

interface DebridementScore {
  score: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  missingElements: string[];
}

interface GenerateResponse {
  note: string;
  score: DebridementScore;
  suggestedCpt: string;
}

interface FormState {
  diagnosis: string;
  woundLocation: string;
  lengthCm: string;
  widthCm: string;
  depthCm: string;
  tissuePresent: string;
  procedureMethod: string;
  tissueRemoved: string;
  depthRemoved: string;
  surfaceAreaSqCm: string;
  hemostasis: string;
  postProcedureStatus: string;
  followUpPlan: string;
}

const initialForm: FormState = {
  diagnosis: "",
  woundLocation: "",
  lengthCm: "",
  widthCm: "",
  depthCm: "",
  tissuePresent: "",
  procedureMethod: "",
  tissueRemoved: "",
  depthRemoved: "",
  surfaceAreaSqCm: "",
  hemostasis: "",
  postProcedureStatus: "",
  followUpPlan: "",
};

export function DebridementDocumentationClient() {
  const [module, setModule] = useState<ModulePayload | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchJson<ModulePayload>("/modules/debridement-documentation-mastery")
      .then(setModule)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Failed to load module."),
      );
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const payload = await fetchJson<GenerateResponse>("/tools/debridement/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: form.diagnosis,
          woundLocation: form.woundLocation,
          lengthCm: form.lengthCm ? Number(form.lengthCm) : undefined,
          widthCm: form.widthCm ? Number(form.widthCm) : undefined,
          depthCm: form.depthCm ? Number(form.depthCm) : undefined,
          tissuePresent: form.tissuePresent,
          procedureMethod: form.procedureMethod,
          tissueRemoved: form.tissueRemoved,
          depthRemoved: form.depthRemoved,
          surfaceAreaSqCm: form.surfaceAreaSqCm ? Number(form.surfaceAreaSqCm) : undefined,
          hemostasis: form.hemostasis,
          postProcedureStatus: form.postProcedureStatus,
          followUpPlan: form.followUpPlan,
        }),
      });
      setResult(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid">
      <section className="hero">
        <div className="pill">Shared Core Module</div>
        <h1>Debridement Documentation Mastery</h1>
        <p className="muted">Clear debridement documentation + coding-ready note structure.</p>
        <p className="muted">3 lessons / 24 minutes total.</p>
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
        <h2>Debridement note builder</h2>
        <div className="split">
          <label className="field">
            Diagnosis
            <input onChange={(e) => update("diagnosis", e.target.value)} value={form.diagnosis} />
          </label>
          <label className="field">
            Wound location
            <input
              onChange={(e) => update("woundLocation", e.target.value)}
              value={form.woundLocation}
            />
          </label>
          <label className="field">
            Length (cm)
            <input onChange={(e) => update("lengthCm", e.target.value)} type="number" value={form.lengthCm} />
          </label>
          <label className="field">
            Width (cm)
            <input onChange={(e) => update("widthCm", e.target.value)} type="number" value={form.widthCm} />
          </label>
          <label className="field">
            Depth (cm)
            <input onChange={(e) => update("depthCm", e.target.value)} type="number" value={form.depthCm} />
          </label>
          <label className="field">
            Tissue present
            <textarea onChange={(e) => update("tissuePresent", e.target.value)} rows={2} value={form.tissuePresent} />
          </label>
          <label className="field">
            Procedure method
            <textarea onChange={(e) => update("procedureMethod", e.target.value)} rows={2} value={form.procedureMethod} />
          </label>
          <label className="field">
            Tissue removed
            <textarea onChange={(e) => update("tissueRemoved", e.target.value)} rows={2} value={form.tissueRemoved} />
          </label>
          <label className="field">
            Depth removed
            <select onChange={(e) => update("depthRemoved", e.target.value)} value={form.depthRemoved}>
              <option value="">Select depth</option>
              <option value="selective">Selective</option>
              <option value="subcutaneous">Subcutaneous</option>
              <option value="muscle">Muscle</option>
              <option value="bone">Bone</option>
            </select>
          </label>
          <label className="field">
            Surface area (sq cm)
            <input
              onChange={(e) => update("surfaceAreaSqCm", e.target.value)}
              type="number"
              value={form.surfaceAreaSqCm}
            />
          </label>
          <label className="field">
            Hemostasis
            <input onChange={(e) => update("hemostasis", e.target.value)} value={form.hemostasis} />
          </label>
          <label className="field">
            Post-procedure status
            <textarea
              onChange={(e) => update("postProcedureStatus", e.target.value)}
              rows={2}
              value={form.postProcedureStatus}
            />
          </label>
          <label className="field">
            Follow-up plan
            <textarea onChange={(e) => update("followUpPlan", e.target.value)} rows={2} value={form.followUpPlan} />
          </label>
        </div>
        <div className="actions">
          <button className="button" disabled={busy} onClick={() => void generate()} type="button">
            {busy ? "Generating..." : "Generate debridement note"}
          </button>
        </div>
      </section>

      {result ? (
        <>
          <section className="card">
            <h2>Audit result</h2>
            <div className={result.score.risk === "LOW" ? "status-good" : "status-bad"}>
              Score: {result.score.score} / Risk: {result.score.risk} / Suggested CPT: {result.suggestedCpt}
            </div>
            {result.score.missingElements.length > 0 ? (
              <div className="muted">Missing: {result.score.missingElements.join(" / ")}</div>
            ) : (
              <div className="muted">All required elements documented.</div>
            )}
          </section>
          <section className="card">
            <h2>Generated note</h2>
            <pre className="question mono">{result.note}</pre>
          </section>
        </>
      ) : null}

      {error ? <div className="card status-bad">{error}</div> : null}
    </div>
  );
}

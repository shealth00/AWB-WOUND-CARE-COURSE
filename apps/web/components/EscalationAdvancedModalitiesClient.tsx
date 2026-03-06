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

interface EscalationResponse {
  percentAreaReduction: number;
  recommendationCode:
    | "CONTINUE_STANDARD_CARE"
    | "STANDARD_CARE_NOT_COMPLETE"
    | "TREAT_INFECTION"
    | "DEBRIDEMENT_NEEDED"
    | "ESCALATE_ADVANCED_MODALITY";
  recommendation: string;
  graftRecommendation: string;
  rationale: string[];
}

interface FormState {
  weeksOfTreatment: string;
  percentAreaReduction: string;
  initialAreaSqCm: string;
  currentAreaSqCm: string;
  infectionPresent: boolean;
  necroticTissuePresent: boolean;
  standardCareCompleted: boolean;
}

const initialForm: FormState = {
  weeksOfTreatment: "4",
  percentAreaReduction: "",
  initialAreaSqCm: "",
  currentAreaSqCm: "",
  infectionPresent: false,
  necroticTissuePresent: false,
  standardCareCompleted: true,
};

export function EscalationAdvancedModalitiesClient() {
  const [module, setModule] = useState<ModulePayload | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<EscalationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchJson<ModulePayload>("/modules/escalation-advanced-modalities")
      .then(setModule)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Failed to load module."),
      );
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function evaluate() {
    setBusy(true);
    setError(null);
    try {
      const payload = await fetchJson<EscalationResponse>("/tools/escalation/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weeksOfTreatment: form.weeksOfTreatment ? Number(form.weeksOfTreatment) : undefined,
          percentAreaReduction: form.percentAreaReduction
            ? Number(form.percentAreaReduction)
            : undefined,
          initialAreaSqCm: form.initialAreaSqCm ? Number(form.initialAreaSqCm) : undefined,
          currentAreaSqCm: form.currentAreaSqCm ? Number(form.currentAreaSqCm) : undefined,
          infectionPresent: form.infectionPresent,
          necroticTissuePresent: form.necroticTissuePresent,
          standardCareCompleted: form.standardCareCompleted,
        }),
      });
      setResult(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Escalation evaluation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid">
      <section className="hero">
        <div className="pill">Shared Core Module</div>
        <h1>Escalation to Advanced Modalities + Grafting / CTP</h1>
        <p className="muted">Escalation logic tied to standard care and objective trends.</p>
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
        <h2>Escalation decision support</h2>
        <div className="split">
          <label className="field">
            Weeks of treatment
            <input
              type="number"
              value={form.weeksOfTreatment}
              onChange={(event) => update("weeksOfTreatment", event.target.value)}
            />
          </label>
          <label className="field">
            Percent area reduction (optional)
            <input
              type="number"
              value={form.percentAreaReduction}
              onChange={(event) => update("percentAreaReduction", event.target.value)}
            />
          </label>
          <label className="field">
            Initial area (sq cm)
            <input
              type="number"
              value={form.initialAreaSqCm}
              onChange={(event) => update("initialAreaSqCm", event.target.value)}
            />
          </label>
          <label className="field">
            Current area (sq cm)
            <input
              type="number"
              value={form.currentAreaSqCm}
              onChange={(event) => update("currentAreaSqCm", event.target.value)}
            />
          </label>
          <label className="field">
            Infection present
            <input
              type="checkbox"
              checked={form.infectionPresent}
              onChange={(event) => update("infectionPresent", event.target.checked)}
            />
          </label>
          <label className="field">
            Necrotic tissue present
            <input
              type="checkbox"
              checked={form.necroticTissuePresent}
              onChange={(event) => update("necroticTissuePresent", event.target.checked)}
            />
          </label>
          <label className="field">
            Standard care completed
            <input
              type="checkbox"
              checked={form.standardCareCompleted}
              onChange={(event) => update("standardCareCompleted", event.target.checked)}
            />
          </label>
        </div>
        <div className="actions">
          <button type="button" className="button" disabled={busy} onClick={() => void evaluate()}>
            {busy ? "Evaluating..." : "Run escalation logic"}
          </button>
        </div>
      </section>

      {result ? (
        <section className="card">
          <h2>Recommendation</h2>
          <div className={result.recommendationCode === "ESCALATE_ADVANCED_MODALITY" ? "status-good" : "status-bad"}>
            {result.recommendation}
          </div>
          <div className="muted">
            Percent area reduction used: {result.percentAreaReduction.toFixed(1)}%
          </div>
          <div className="muted">CTP guidance: {result.graftRecommendation}</div>
          <div className="stack">
            {result.rationale.map((item) => (
              <div key={item} className="question">
                {item}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {error ? <div className="card status-bad">{error}</div> : null}
    </div>
  );
}

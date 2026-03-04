"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiUrl } from "../src/api";

interface QuizQuestion {
  id: string;
  question_type: string;
  stem: string;
  options: Array<{ key: string; value: string }>;
  rationale: string | null;
}

interface QuizResponse {
  track: string;
  moduleId: string;
  passingScore: number;
  questions: QuizQuestion[];
}

interface QuizSubmitResponse {
  attemptId: string;
  attemptNumber: number;
  score: number;
  pass: boolean;
  correctAnswers: number;
  totalQuestions: number;
  certificateId: string | null;
  smartsheetSynced: boolean;
}

export function QuizClient() {
  const searchParams = useSearchParams();
  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);
  const [userId, setUserId] = useState("demo-user");
  const [error, setError] = useState<string | null>(null);

  const track = searchParams.get("track") ?? "";
  const moduleId = searchParams.get("moduleId") ?? "";

  useEffect(() => {
    if (!track || !moduleId) {
      return;
    }

    setError(null);
    void fetch(
      apiUrl(`/quiz?track=${encodeURIComponent(track)}&moduleId=${encodeURIComponent(moduleId)}&n=10`),
    )
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to load quiz.");
        }

        return (await response.json()) as QuizResponse;
      })
      .then((payload) => {
        setQuiz(payload);
        setAnswers({});
        setResult(null);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Failed to load quiz."),
      );
  }, [moduleId, track]);

  const isReady = useMemo(() => quiz && track && moduleId, [moduleId, quiz, track]);

  async function submitQuiz() {
    if (!quiz) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/quiz/submit"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          track,
          moduleId,
          isFinalExam: true,
          timeSpentSec: quiz.questions.length * 45,
          answers: quiz.questions.map((question) => ({
            questionId: question.id,
            selected: answers[question.id] ?? [],
          })),
        }),
      });

      const payload = (await response.json()) as QuizSubmitResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? (payload.error ?? "Quiz submission failed.") : "Quiz submission failed.");
      }

      setResult(payload as QuizSubmitResponse);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Quiz submission failed.");
    } finally {
      setLoading(false);
    }
  }

  function updateAnswer(questionId: string, optionKey: string, multi: boolean) {
    setAnswers((current) => {
      const existing = current[questionId] ?? [];

      if (multi) {
        const next = existing.includes(optionKey)
          ? existing.filter((value) => value !== optionKey)
          : [...existing, optionKey];
        return {
          ...current,
          [questionId]: next,
        };
      }

      return {
        ...current,
        [questionId]: [optionKey],
      };
    });
  }

  if (!track || !moduleId) {
    return (
      <div className="card">
        Add `track` and `moduleId` in the URL to load a quiz, for example:
        <div className="mono">/quiz?track=Skin%20Graft&moduleId=MOD-101</div>
      </div>
    );
  }

  if (error) {
    return <div className="card status-bad">{error}</div>;
  }

  if (!isReady || !quiz) {
    return <div className="card">Loading quiz...</div>;
  }

  return (
    <div className="grid">
      <section className="hero">
        <div className="pill">{track}</div>
        <h1>Module quiz</h1>
        <p className="muted">
          Module <span className="mono">{moduleId}</span> with {quiz.questions.length} questions. Passing score:
          {" "}{quiz.passingScore}%.
        </p>
        <div className="field" style={{ maxWidth: 360 }}>
          <label htmlFor="userId">User ID</label>
          <input id="userId" value={userId} onChange={(event) => setUserId(event.target.value)} />
        </div>
      </section>

      <section className="stack">
        {quiz.questions.map((question, index) => {
          const multi = question.question_type.toLowerCase() === "multi";

          return (
            <article className="question" key={question.id}>
              <strong>
                {index + 1}. {question.stem}
              </strong>
              <div className="options">
                {question.options.map((option) => (
                  <label key={option.key}>
                    <input
                      checked={(answers[question.id] ?? []).includes(option.key)}
                      onChange={() => updateAnswer(question.id, option.key, multi)}
                      type={multi ? "checkbox" : "radio"}
                    />
                    {" "}
                    <span className="mono">{option.key}</span> {option.value}
                  </label>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <div className="actions">
        <button className="button" disabled={loading} onClick={() => void submitQuiz()} type="button">
          {loading ? "Submitting..." : "Submit quiz"}
        </button>
      </div>

      {result ? (
        <section className="card">
          <h2>Result</h2>
          <p className={result.pass ? "status-good" : "status-bad"}>
            Score {result.score}% ({result.correctAnswers}/{result.totalQuestions}){" "}
            {result.pass ? "passed" : "did not pass"}.
          </p>
          {result.certificateId ? (
            <p>
              Certificate issued:
              {" "}
              <a href={`/verify/${encodeURIComponent(result.certificateId)}`}>{result.certificateId}</a>
            </p>
          ) : null}
          {!result.smartsheetSynced ? (
            <p className="status-warn">Saved locally, but Smartsheet writeback failed.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

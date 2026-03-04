import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQuiz,
  generateCertificateId,
  gradeQuiz,
  maskLearnerName,
  normalizeAnswer,
  resolveCertificateTrackCode,
  routeIvr,
} from "./index.js";

test("generateCertificateId follows the AWB certificate format", () => {
  const id = generateCertificateId("providers", new Date("2026-03-03T12:00:00.000Z"));

  assert.match(id, /^AWB-AWC-SG-PROV-20260303-[A-Z0-9]{6}$/);
});

test("buildQuiz rotates through difficulty buckets", () => {
  const questions = [
    { id: "1", difficulty: 1, correctAnswer: "A" },
    { id: "2", difficulty: 1, correctAnswer: "A" },
    { id: "3", difficulty: 2, correctAnswer: "A" },
    { id: "4", difficulty: 3, correctAnswer: "A" },
  ];

  const selected = buildQuiz(questions, 3, () => 0.1);

  assert.deepEqual(
    selected.map((question) => question.id).sort(),
    ["1", "3", "4"],
  );
});

test("gradeQuiz accepts multi-select answers independent of order", () => {
  const result = gradeQuiz(
    [
      { id: "1", difficulty: 1, correctAnswer: "A,C" },
      { id: "2", difficulty: 2, correctAnswer: "B" },
    ],
    [
      { questionId: "1", selected: ["C", "A"] },
      { questionId: "2", selected: ["B"] },
    ],
  );

  assert.deepEqual(result, {
    totalQuestions: 2,
    correctAnswers: 2,
    score: 100,
    pass: true,
  });
  assert.equal(normalizeAnswer(["c", "a"]), "A,C");
});

test("routeIvr prioritizes red flags before request type", () => {
  assert.deepEqual(
    routeIvr({
      redFlags: ["fever"],
      requestType: "Training",
    }),
    {
      priority: "Urgent",
      assignedTo: "Clinical Triage",
    },
  );
});

test("routeIvr follows the workflow routing rules", () => {
  assert.deepEqual(routeIvr({ redFlags: [], requestType: "Training" }), {
    priority: "Routine",
    assignedTo: "Education",
  });
  assert.deepEqual(routeIvr({ redFlags: [], requestType: "Billing" }), {
    priority: "Routine",
    assignedTo: "Revenue Cycle",
  });
  assert.deepEqual(routeIvr({ redFlags: [], requestType: "Consult" }), {
    priority: "Routine",
    assignedTo: "Wound Navigator",
  });
});

test("resolveCertificateTrackCode maps track names to AWB codes", () => {
  assert.equal(resolveCertificateTrackCode("providers"), "PROV");
  assert.equal(resolveCertificateTrackCode("Sales & Marketing Track"), "SALES");
  assert.equal(resolveCertificateTrackCode("distributors"), "DIST");
  assert.equal(resolveCertificateTrackCode("Post-Acute & Senior Care Track"), "FAC");
  assert.equal(resolveCertificateTrackCode("ASC / Ortho Track"), "ASC");
});

test("maskLearnerName partially masks public verification names", () => {
  assert.equal(maskLearnerName("Ishmael Ambrosino"), "Ish**** Amb******");
});

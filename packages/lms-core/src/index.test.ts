import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQuiz,
  calculateWoundAreaReduction,
  evaluateEscalation,
  generateDebridementNote,
  generateAuditReadyWoundNote,
  generateCertificateId,
  gradeQuiz,
  maskLearnerName,
  normalizeAnswer,
  resolveCertificateTrackCode,
  routeIvr,
  scoreDebridementDocumentation,
  scoreAuditReadyWoundNote,
  suggestDebridementCptCode,
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

test("scoreAuditReadyWoundNote scores required audit fields and risk tiers", () => {
  const highRisk = scoreAuditReadyWoundNote({
    diagnosis: "DFU",
  });
  assert.equal(highRisk.score, 10);
  assert.equal(highRisk.risk, "HIGH");
  assert.equal(highRisk.passed, false);
  assert.ok(highRisk.missingElements.includes("procedure description"));

  const lowRisk = scoreAuditReadyWoundNote({
    diagnosis: "Type 2 diabetes mellitus with foot ulcer",
    location: "Right plantar forefoot",
    lengthCm: 3.2,
    widthCm: 2.1,
    depthCm: 0.4,
    necroticTissue: "30% necrotic tissue present",
    procedure: "Selective sharp debridement",
    tissueRemoved: "Devitalized subcutaneous tissue",
    postProcedureStatus: "Healthy granulation tissue visible",
    followUpPlan: "Recheck in 7 days with offloading reinforcement",
  });
  assert.equal(lowRisk.score, 100);
  assert.equal(lowRisk.risk, "LOW");
  assert.equal(lowRisk.passed, true);
});

test("generateAuditReadyWoundNote renders a defensible note block", () => {
  const note = generateAuditReadyWoundNote({
    diagnosis: "E11.621 / L97.412",
    location: "Right plantar forefoot",
    lengthCm: 3.2,
    widthCm: 2.1,
    depthCm: 0.4,
    necroticTissue: "30%",
    procedure: "Selective sharp debridement",
    tissueRemoved: "Devitalized subcutaneous tissue",
    postProcedureStatus: "Granulation tissue visible",
    followUpPlan: "Weekly follow-up",
  });

  assert.match(note, /Diagnosis: E11\.621 \/ L97\.412/);
  assert.match(note, /Size \(cm\): 3\.2 x 2\.1 x 0\.4/);
  assert.match(note, /Procedure: Selective sharp debridement/);
});

test("suggestDebridementCptCode maps depth removed to CPT family", () => {
  assert.equal(suggestDebridementCptCode({ depthRemoved: "subcutaneous" }), "11042");
  assert.equal(suggestDebridementCptCode({ depthRemoved: "muscle" }), "11043");
  assert.equal(suggestDebridementCptCode({ depthRemoved: "bone" }), "11044");
  assert.equal(suggestDebridementCptCode({ depthRemoved: "selective" }), "97597");
});

test("scoreDebridementDocumentation returns weighted score and risk", () => {
  const low = scoreDebridementDocumentation({
    lengthCm: 3,
    widthCm: 2,
    depthCm: 0.5,
    tissuePresent: "30% necrotic tissue",
    tissueRemoved: "Devitalized subcutaneous tissue",
    surfaceAreaSqCm: 6.5,
    postProcedureStatus: "Granulation tissue visible",
  });
  assert.equal(low.score, 100);
  assert.equal(low.risk, "LOW");
  assert.deepEqual(low.missingElements, []);

  const high = scoreDebridementDocumentation({
    tissuePresent: "Necrosis",
  });
  assert.equal(high.score, 20);
  assert.equal(high.risk, "HIGH");
  assert.ok(high.missingElements.includes("surface area"));
});

test("generateDebridementNote renders coding-ready note text", () => {
  const note = generateDebridementNote({
    diagnosis: "E11.621",
    woundLocation: "Right plantar forefoot",
    lengthCm: 3.2,
    widthCm: 2.1,
    depthCm: 0.4,
    tissuePresent: "30% necrotic tissue",
    procedureMethod: "Selective sharp debridement with curette",
    tissueRemoved: "Devitalized subcutaneous tissue",
    depthRemoved: "subcutaneous",
    surfaceAreaSqCm: 6.5,
    hemostasis: "Pressure",
    postProcedureStatus: "Healthy granulation visible",
    followUpPlan: "Weekly wound evaluation",
  });

  assert.match(note, /Suggested CPT: 11042/);
  assert.match(note, /Surface Area Treated \(sq cm\): 6\.5/);
});

test("calculateWoundAreaReduction returns one-decimal reduction percentage", () => {
  assert.equal(calculateWoundAreaReduction(10, 6.8), 32);
  assert.equal(calculateWoundAreaReduction(12.5, 10), 20);
});

test("evaluateEscalation enforces standard care and objective trend gates", () => {
  const blocked = evaluateEscalation({
    weeksOfTreatment: 5,
    percentAreaReduction: 10,
    standardCareCompleted: false,
  });
  assert.equal(blocked.recommendationCode, "STANDARD_CARE_NOT_COMPLETE");

  const continueCare = evaluateEscalation({
    weeksOfTreatment: 4,
    percentAreaReduction: 35,
    standardCareCompleted: true,
  });
  assert.equal(continueCare.recommendationCode, "CONTINUE_STANDARD_CARE");

  const infection = evaluateEscalation({
    weeksOfTreatment: 6,
    percentAreaReduction: 20,
    infectionPresent: true,
    standardCareCompleted: true,
  });
  assert.equal(infection.recommendationCode, "TREAT_INFECTION");

  const escalate = evaluateEscalation({
    weeksOfTreatment: 6,
    percentAreaReduction: 25,
    infectionPresent: false,
    necroticTissuePresent: false,
    standardCareCompleted: true,
  });
  assert.equal(escalate.recommendationCode, "ESCALATE_ADVANCED_MODALITY");
  assert.match(escalate.graftRecommendation, /CTP/i);
});

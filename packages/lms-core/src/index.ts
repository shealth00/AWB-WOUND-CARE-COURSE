export const PASSING_SCORE = 80;
export const VIDEO_COMPLETION_THRESHOLD = 0.9;

export const ALLOWED_SITE_TYPES = [
  "SNF",
  "NH",
  "ALF",
  "Adult Senior Care",
  "ASC",
  "Clinic",
  "Ortho",
] as const;
export const ALLOWED_WOUND_TYPES = [
  "DFU",
  "VLU",
  "Pressure",
  "Surgical",
  "Trauma",
  "Other",
] as const;
export const ALLOWED_REQUEST_TYPES = [
  "Consult",
  "Supplies",
  "Graft inquiry",
  "Training",
  "Billing",
] as const;
export const RED_FLAG_OPTIONS = [
  "fever",
  "spreading erythema",
  "uncontrolled bleeding",
  "severe pain",
] as const;

export type SiteType = (typeof ALLOWED_SITE_TYPES)[number];
export type WoundType = (typeof ALLOWED_WOUND_TYPES)[number];
export type RequestType = (typeof ALLOWED_REQUEST_TYPES)[number];
export type RedFlag = (typeof RED_FLAG_OPTIONS)[number];

const CERTIFICATE_TRACK_CODES = {
  providers: "PROV",
  "sales-marketers": "SALES",
  distributors: "DIST",
  "post-acute-senior-care": "FAC",
  "asc-ortho": "ASC",
} as const;

export interface QuestionRecord {
  id: string;
  difficulty: number;
  correctAnswer: string;
}

export interface QuizSubmissionAnswer {
  questionId: string;
  selected: string[];
}

export interface QuizScoreResult {
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  pass: boolean;
}

export interface IvrRoutingInput {
  redFlags: string[];
  requestType: string;
  priority?: string;
}

export interface IvrRoutingDecision {
  priority: "Routine" | "Urgent";
  assignedTo: "Clinical Triage" | "Education" | "Revenue Cycle" | "Wound Navigator";
}

export interface WoundAuditNoteInput {
  diagnosis?: string;
  location?: string;
  lengthCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
  necroticTissue?: string;
  procedure?: string;
  tissueRemoved?: string;
  postProcedureStatus?: string;
  followUpPlan?: string;
}

export interface WoundAuditScoreResult {
  score: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  passed: boolean;
  missingElements: string[];
}

export interface DebridementNoteInput {
  diagnosis?: string;
  woundLocation?: string;
  lengthCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
  tissuePresent?: string;
  procedureMethod?: string;
  tissueRemoved?: string;
  depthRemoved?: "skin" | "subcutaneous" | "muscle" | "bone" | "selective" | string;
  surfaceAreaSqCm?: number | null;
  hemostasis?: string;
  postProcedureStatus?: string;
  followUpPlan?: string;
}

export interface DebridementAuditScoreResult {
  score: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  missingElements: string[];
}

export interface EscalationEvaluationInput {
  weeksOfTreatment?: number | null;
  percentAreaReduction?: number | null;
  infectionPresent?: boolean;
  necroticTissuePresent?: boolean;
  standardCareCompleted?: boolean;
}

export type EscalationRecommendationCode =
  | "CONTINUE_STANDARD_CARE"
  | "STANDARD_CARE_NOT_COMPLETE"
  | "TREAT_INFECTION"
  | "DEBRIDEMENT_NEEDED"
  | "ESCALATE_ADVANCED_MODALITY";

export interface EscalationEvaluationResult {
  recommendationCode: EscalationRecommendationCode;
  recommendation: string;
  graftRecommendation: string;
  rationale: string[];
}

export function generateCertificateId(track: string, issuedAt: Date = new Date()): string {
  const normalizedTrack = resolveCertificateTrackCode(track);
  const yyyymmdd = issuedAt.toISOString().slice(0, 10).replaceAll("-", "");
  const random = randomToken(6).toUpperCase();
  return `AWB-AWC-SG-${normalizedTrack}-${yyyymmdd}-${random}`;
}

export function normalizeTrackKey(input: string): string {
  return normalizeToken(input).toUpperCase();
}

export function buildQuiz(
  questions: QuestionRecord[],
  count: number,
  random: () => number = Math.random,
): QuestionRecord[] {
  const bucketed = new Map<number, QuestionRecord[]>();

  for (const question of questions) {
    const bucket = bucketed.get(question.difficulty) ?? [];
    bucket.push(question);
    bucketed.set(question.difficulty, bucket);
  }

  for (const bucket of bucketed.values()) {
    shuffle(bucket, random);
  }

  const order = Array.from(bucketed.keys()).sort((a, b) => a - b);
  const selected: QuestionRecord[] = [];

  while (selected.length < count && order.length > 0) {
    let madeProgress = false;

    for (const difficulty of order) {
      const bucket = bucketed.get(difficulty)!;
      const next = bucket.pop();

      if (next) {
        selected.push(next);
        madeProgress = true;
      }

      if (selected.length === count) {
        break;
      }
    }

    if (!madeProgress) {
      break;
    }
  }

  return selected;
}

export function gradeQuiz(
  questions: QuestionRecord[],
  answers: QuizSubmissionAnswer[],
): QuizScoreResult {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, normalizeAnswer(answer.selected)]));
  let correctAnswers = 0;

  for (const question of questions) {
    if (answerMap.get(question.id) === normalizeAnswer(question.correctAnswer.split(","))) {
      correctAnswers += 1;
    }
  }

  const totalQuestions = questions.length;
  const score = totalQuestions === 0 ? 0 : Math.round((correctAnswers / totalQuestions) * 100);

  return {
    totalQuestions,
    correctAnswers,
    score,
    pass: score >= PASSING_SCORE,
  };
}

export function routeIvr(input: IvrRoutingInput): IvrRoutingDecision {
  const normalizedRequestType = input.requestType.trim().toLowerCase();
  const hasRedFlags = input.redFlags.some((flag) => RED_FLAG_OPTIONS.includes(flag.toLowerCase() as RedFlag));

  if (hasRedFlags || input.priority?.toLowerCase() === "urgent") {
    return {
      priority: "Urgent",
      assignedTo: "Clinical Triage",
    };
  }

  if (normalizedRequestType === "training") {
    return {
      priority: "Routine",
      assignedTo: "Education",
    };
  }

  if (normalizedRequestType === "billing") {
    return {
      priority: "Routine",
      assignedTo: "Revenue Cycle",
    };
  }

  return {
    priority: "Routine",
    assignedTo: "Wound Navigator",
  };
}

export function scoreAuditReadyWoundNote(note: WoundAuditNoteInput): WoundAuditScoreResult {
  let score = 0;
  const missingElements: string[] = [];

  if (hasText(note.diagnosis)) {
    score += 10;
  } else {
    missingElements.push("diagnosis");
  }

  if (isPositiveNumber(note.lengthCm) && isPositiveNumber(note.widthCm) && isPositiveNumber(note.depthCm)) {
    score += 20;
  } else {
    missingElements.push("wound dimensions (LxWxD)");
  }

  if (hasText(note.necroticTissue)) {
    score += 10;
  } else {
    missingElements.push("necrotic tissue description");
  }

  if (hasText(note.procedure)) {
    score += 20;
  } else {
    missingElements.push("procedure description");
  }

  if (hasText(note.tissueRemoved)) {
    score += 20;
  } else {
    missingElements.push("tissue removed");
  }

  if (hasText(note.postProcedureStatus)) {
    score += 10;
  } else {
    missingElements.push("post-procedure wound status");
  }

  if (hasText(note.followUpPlan)) {
    score += 10;
  } else {
    missingElements.push("follow-up plan");
  }

  const risk: "LOW" | "MEDIUM" | "HIGH" =
    score >= 90 ? "LOW" : score >= 70 ? "MEDIUM" : "HIGH";

  return {
    score,
    risk,
    passed: score >= 90,
    missingElements,
  };
}

export function generateAuditReadyWoundNote(note: WoundAuditNoteInput): string {
  const length = isPositiveNumber(note.lengthCm) ? note.lengthCm.toFixed(1) : "n/a";
  const width = isPositiveNumber(note.widthCm) ? note.widthCm.toFixed(1) : "n/a";
  const depth = isPositiveNumber(note.depthCm) ? note.depthCm.toFixed(1) : "n/a";

  return [
    `Diagnosis: ${note.diagnosis?.trim() || "n/a"}`,
    `Location: ${note.location?.trim() || "n/a"}`,
    `Size (cm): ${length} x ${width} x ${depth}`,
    `Necrotic tissue: ${note.necroticTissue?.trim() || "n/a"}`,
    `Procedure: ${note.procedure?.trim() || "n/a"}`,
    `Tissue removed: ${note.tissueRemoved?.trim() || "n/a"}`,
    `Post-procedure status: ${note.postProcedureStatus?.trim() || "n/a"}`,
    `Follow-up plan: ${note.followUpPlan?.trim() || "n/a"}`,
  ].join("\n");
}

export function suggestDebridementCptCode(input: DebridementNoteInput): string {
  const depth = (input.depthRemoved ?? "").toLowerCase();

  if (depth.includes("bone")) {
    return "11044";
  }
  if (depth.includes("muscle")) {
    return "11043";
  }
  if (depth.includes("subcutaneous")) {
    return "11042";
  }

  return "97597";
}

export function scoreDebridementDocumentation(input: DebridementNoteInput): DebridementAuditScoreResult {
  let score = 0;
  const missingElements: string[] = [];

  if (isPositiveNumber(input.lengthCm) && isPositiveNumber(input.widthCm) && isPositiveNumber(input.depthCm)) {
    score += 20;
  } else {
    missingElements.push("wound dimensions");
  }

  if (hasText(input.tissuePresent)) {
    score += 20;
  } else {
    missingElements.push("tissue present");
  }

  if (hasText(input.tissueRemoved)) {
    score += 20;
  } else {
    missingElements.push("tissue removed");
  }

  if (isPositiveNumber(input.surfaceAreaSqCm)) {
    score += 20;
  } else {
    missingElements.push("surface area");
  }

  if (hasText(input.postProcedureStatus)) {
    score += 20;
  } else {
    missingElements.push("post-procedure status");
  }

  const risk: "LOW" | "MEDIUM" | "HIGH" =
    score >= 90 ? "LOW" : score >= 70 ? "MEDIUM" : "HIGH";

  return {
    score,
    risk,
    missingElements,
  };
}

export function generateDebridementNote(input: DebridementNoteInput): string {
  const length = isPositiveNumber(input.lengthCm) ? input.lengthCm.toFixed(1) : "n/a";
  const width = isPositiveNumber(input.widthCm) ? input.widthCm.toFixed(1) : "n/a";
  const depth = isPositiveNumber(input.depthCm) ? input.depthCm.toFixed(1) : "n/a";
  const area = isPositiveNumber(input.surfaceAreaSqCm) ? input.surfaceAreaSqCm.toFixed(1) : "n/a";
  const cpt = suggestDebridementCptCode(input);

  return [
    `Diagnosis: ${input.diagnosis?.trim() || "n/a"}`,
    `Wound Location: ${input.woundLocation?.trim() || "n/a"}`,
    `Pre-Procedure Measurements (cm): ${length} x ${width} x ${depth}`,
    `Tissue Present: ${input.tissuePresent?.trim() || "n/a"}`,
    `Procedure Method: ${input.procedureMethod?.trim() || "n/a"}`,
    `Tissue Removed: ${input.tissueRemoved?.trim() || "n/a"}`,
    `Depth Removed: ${input.depthRemoved?.trim() || "n/a"}`,
    `Surface Area Treated (sq cm): ${area}`,
    `Hemostasis: ${input.hemostasis?.trim() || "n/a"}`,
    `Post-Procedure Status: ${input.postProcedureStatus?.trim() || "n/a"}`,
    `Follow-Up Plan: ${input.followUpPlan?.trim() || "n/a"}`,
    `Suggested CPT: ${cpt}`,
  ].join("\n");
}

export function calculateWoundAreaReduction(
  initialAreaSqCm: number,
  currentAreaSqCm: number,
): number {
  if (!Number.isFinite(initialAreaSqCm) || !Number.isFinite(currentAreaSqCm) || initialAreaSqCm <= 0) {
    return 0;
  }

  const reduction = ((initialAreaSqCm - currentAreaSqCm) / initialAreaSqCm) * 100;
  const clamped = Math.max(-100, Math.min(100, reduction));
  return Math.round(clamped * 10) / 10;
}

export function evaluateEscalation(input: EscalationEvaluationInput): EscalationEvaluationResult {
  const weeks = Number.isFinite(input.weeksOfTreatment as number) ? Number(input.weeksOfTreatment) : 0;
  const reduction = Number.isFinite(input.percentAreaReduction as number)
    ? Number(input.percentAreaReduction)
    : 0;
  const infectionPresent = Boolean(input.infectionPresent);
  const necroticTissuePresent = Boolean(input.necroticTissuePresent);
  const standardCareCompleted = input.standardCareCompleted !== false;
  const rationale: string[] = [];

  if (!standardCareCompleted) {
    rationale.push("Escalation is not appropriate until standard care has been completed and documented.");
    return {
      recommendationCode: "STANDARD_CARE_NOT_COMPLETE",
      recommendation: "Complete standard care and document objective trends before escalation.",
      graftRecommendation: "Not eligible for CTP consideration until standard care is completed.",
      rationale,
    };
  }

  if (weeks < 4) {
    rationale.push("Treatment duration is under 4 weeks.");
    return {
      recommendationCode: "CONTINUE_STANDARD_CARE",
      recommendation: "Continue standard care and trend objective measurements weekly.",
      graftRecommendation: "Not yet eligible for CTP consideration.",
      rationale,
    };
  }

  if (reduction >= 30) {
    rationale.push("Wound area reduction meets or exceeds 30% at week 4 or later.");
    return {
      recommendationCode: "CONTINUE_STANDARD_CARE",
      recommendation: "Continue standard care; objective trend supports current plan.",
      graftRecommendation:
        reduction < 50
          ? "CTP may be considered if healing stalls after continued advanced therapy."
          : "CTP not indicated while objective healing is progressing.",
      rationale,
    };
  }

  if (infectionPresent) {
    rationale.push("Infection is present and should be addressed before escalation.");
    return {
      recommendationCode: "TREAT_INFECTION",
      recommendation: "Treat infection and reassess objective healing trend before escalation.",
      graftRecommendation: "Not eligible for CTP until infection is controlled.",
      rationale,
    };
  }

  if (necroticTissuePresent) {
    rationale.push("Necrotic tissue remains and requires additional debridement.");
    return {
      recommendationCode: "DEBRIDEMENT_NEEDED",
      recommendation: "Perform additional debridement and reassess healing trend.",
      graftRecommendation: "Not eligible for CTP until necrotic burden is addressed.",
      rationale,
    };
  }

  rationale.push("Healing trend is below benchmark despite standard care.");
  return {
    recommendationCode: "ESCALATE_ADVANCED_MODALITY",
    recommendation: "Escalate to advanced modality based on objective healing plateau.",
    graftRecommendation:
      reduction < 50
        ? "Eligible for CTP consideration with documented standard care failure and trends."
        : "Continue advanced therapy and trend progress before CTP consideration.",
    rationale,
  };
}

export function splitList(input: string | null | undefined): string[] {
  if (!input) {
    return [];
  }

  return input
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function normalizeAnswer(answer: string[] | string): string {
  const values = Array.isArray(answer) ? answer : answer.split(",");

  return values
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(",");
}

export function resolveCertificateTrackCode(track: string): "PROV" | "SALES" | "DIST" | "FAC" | "ASC" {
  const normalized = normalizeToken(track).toUpperCase();

  if (
    ["FAC", "FACILITY", "POSTACUTE", "POSTACUTESENIORCARE", "SNF", "NH", "ALF"].includes(normalized) ||
    normalized.includes("POST-ACUTE") ||
    normalized.includes("SENIOR-CARE")
  ) {
    return CERTIFICATE_TRACK_CODES["post-acute-senior-care"];
  }

  if (["ASC", "ASCORTHO", "ORTHO"].includes(normalized) || normalized.includes("ASC") || normalized.includes("ORTHO")) {
    return CERTIFICATE_TRACK_CODES["asc-ortho"];
  }

  if (["PROV", "PROVIDER", "PROVIDERS"].includes(normalized)) {
    return CERTIFICATE_TRACK_CODES.providers;
  }

  if (
    ["SALES", "SALESMARKETING", "SALESMARKETERS", "SALESMARKETER", "COMMERCIAL"].includes(
      normalized,
    )
  ) {
    return CERTIFICATE_TRACK_CODES["sales-marketers"];
  }

  if (["DIST", "DISTRIBUTOR", "DISTRIBUTORS"].includes(normalized)) {
    return CERTIFICATE_TRACK_CODES.distributors;
  }

  return normalized.includes("SALES")
    ? CERTIFICATE_TRACK_CODES["sales-marketers"]
    : normalized.includes("FAC")
      ? CERTIFICATE_TRACK_CODES["post-acute-senior-care"]
      : normalized.includes("ASC") || normalized.includes("ORTHO")
        ? CERTIFICATE_TRACK_CODES["asc-ortho"]
    : normalized.includes("DIST")
      ? CERTIFICATE_TRACK_CODES.distributors
      : CERTIFICATE_TRACK_CODES.providers;
}

export function maskLearnerName(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  return parts
    .map((part) => {
      if (part.length <= 2) {
        return `${part[0] ?? ""}*`;
      }

      return `${part.slice(0, 3)}${"*".repeat(Math.max(part.length - 3, 1))}`;
    })
    .join(" ");
}

function normalizeToken(input: string): string {
  return input.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "GENERAL";
}

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function randomToken(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let output = "";

  for (let index = 0; index < length; index += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return output;
}

function shuffle<T>(values: T[], random: () => number): void {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex]!, values[index]!];
  }
}

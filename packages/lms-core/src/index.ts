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

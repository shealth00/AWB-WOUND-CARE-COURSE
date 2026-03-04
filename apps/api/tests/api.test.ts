import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  initializeDatabase: vi.fn(),
  insertAuditLog: vi.fn(),
  insertVerificationLookup: vi.fn(),
  query: vi.fn(),
  recordSyncRun: vi.fn(),
}));

const syncMock = vi.hoisted(() => ({
  getLesson: vi.fn(),
  listLessonsByTrack: vi.fn(),
  listTracks: vi.fn(),
  syncContent: vi.fn(),
}));

const smartsheetMock = vi.hoisted(() => ({
  addRowByColumnTitle: vi.fn(),
  attachFileToRow: vi.fn(),
  attachLinkToRow: vi.fn(),
  createWebhookFromEnv: vi.fn(),
  shareSheet: vi.fn(),
  smartsheetIds: {
    catalog: "sheet-catalog",
    questionBank: "sheet-questionbank",
    results: "sheet-results",
    forms: "sheet-forms",
    ivr: "sheet-ivr",
  },
}));

const certificateMock = vi.hoisted(() => ({
  buildCertificatePresentation: vi.fn(),
}));

const pdfMock = vi.hoisted(() => ({
  canAccessCertificatePdf: vi.fn(),
  renderPdfFromHtml: vi.fn(),
}));

vi.mock("../src/lib/db.js", () => dbMock);
vi.mock("../src/lib/sync.js", () => syncMock);
vi.mock("../src/lib/smartsheet.js", () => smartsheetMock);
vi.mock("../src/lib/certificates.js", () => certificateMock);
vi.mock("../src/lib/pdf.js", () => pdfMock);

const { app } = await import("../src/index.ts");

beforeEach(() => {
  vi.clearAllMocks();

  dbMock.query.mockResolvedValue([]);
  syncMock.listTracks.mockResolvedValue([
    {
      track: "Provider Track",
      module_id: "P1",
      module_title: "Advanced wound assessment",
      lesson_count: "2",
    },
  ]);
  syncMock.listLessonsByTrack.mockResolvedValue([
    {
      lesson_id: "LESSON-1",
      track: "Provider Track",
      module_id: "P1",
      module_title: "Advanced wound assessment",
      lesson_title: "Measure like an auditor will read it",
      duration_min: 8,
      owner: "AWB Faculty",
    },
  ]);
  syncMock.getLesson.mockResolvedValue(null);
  syncMock.syncContent.mockResolvedValue({
    source: "admin",
    catalogRows: 1,
    questionRows: 1,
  });
  smartsheetMock.addRowByColumnTitle.mockResolvedValue({ rowId: "row-1" });
  smartsheetMock.attachFileToRow.mockResolvedValue(undefined);
  smartsheetMock.attachLinkToRow.mockResolvedValue(undefined);
  smartsheetMock.createWebhookFromEnv.mockResolvedValue({ id: "webhook-1" });
  smartsheetMock.shareSheet.mockResolvedValue({ id: "share-1", email: "ops@advancewoundbiologic.com" });
  certificateMock.buildCertificatePresentation.mockImplementation(async (input) => ({
    valid: input.status === "valid",
    certificate: {
      certificate_id: input.certificateId,
      user_id: input.userId,
      learner_full_name: input.learnerFullName,
      track: input.track,
      course_track: input.track,
      track_id: input.trackId,
      module_id: input.moduleId,
      score: input.score,
      status: input.status,
      issued_at: input.issuedAt,
      completion_date: input.completionDate,
      course_title: input.courseTitle ?? input.track,
      issuer_name: "Advance Wound Biologic",
      pdf_url: input.pdfUrl ?? null,
      report_problem_url: `mailto:support@advancewoundbiologic.com?subject=${encodeURIComponent(`Certificate issue: ${input.certificateId}`)}`,
      verification_url: `https://www.advancewoundbiologic.com/verify/${input.certificateId}`,
      html_url: `https://www.advancewoundbiologic.com/api/certificates/${input.certificateId}/html`,
      qr_data_url: "data:image/png;base64,qr",
    },
  }));
  pdfMock.canAccessCertificatePdf.mockReturnValue(true);
  pdfMock.renderPdfFromHtml.mockResolvedValue(Buffer.from("pdf"));
});

describe("AWB API", () => {
  it("returns health status with latest sync metadata", async () => {
    dbMock.query.mockResolvedValueOnce([
      {
        created_at: "2026-03-03T08:00:00.000Z",
        status: "success",
      },
    ]);

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.latestSync.status).toBe("success");
  });

  it("returns catalog payload filtered by track", async () => {
    const response = await request(app).get("/catalog").query({ track: "providers" });

    expect(response.status).toBe(200);
    expect(syncMock.listTracks).toHaveBeenCalledTimes(1);
    expect(syncMock.listLessonsByTrack).toHaveBeenCalledWith("providers");
    expect(response.body.tracks).toHaveLength(1);
    expect(response.body.lessons[0].lesson_id).toBe("LESSON-1");
  });

  it("returns 404 when a lesson is not found", async () => {
    const response = await request(app).get("/lessons/MISSING");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Lesson not found.");
  });

  it("stores lesson progress using the completion threshold", async () => {
    const response = await request(app).post("/progress/lessons").send({
      userId: "demo-user",
      trackId: "providers",
      lessonId: "LESSON-1",
      watchedSeconds: 540,
      totalSeconds: 600,
    });

    expect(response.status).toBe(201);
    expect(response.body.completed).toBe(true);
    expect(dbMock.query).toHaveBeenCalledTimes(1);
    expect(dbMock.query.mock.calls[0]?.[1]?.[6]).toBe(true);
  });

  it("grades a final exam submission and issues a certificate", async () => {
    dbMock.query
      .mockResolvedValueOnce([
        {
          id: "q1",
          difficulty: 1,
          correct_answer: "A",
          stem: "Question",
        },
      ])
      .mockResolvedValueOnce([{ count: "0" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const response = await request(app).post("/quiz/submit").send({
      userId: "demo-user",
      learnerFullName: "Izzy Example",
      learnerEmail: "izzy@example.com",
      track: "providers",
      moduleId: "P-FINAL",
      timeSpentSec: 300,
      isFinalExam: true,
      answers: [
        {
          questionId: "q1",
          selected: ["A"],
        },
      ],
    });

    expect(response.status).toBe(201);
    expect(response.body.pass).toBe(true);
    expect(response.body.certificateId).toMatch(/^AWB-AWC-SG-PROV-\d{8}-[A-Z0-9]{6}$/);
    expect(smartsheetMock.addRowByColumnTitle).toHaveBeenCalledWith(
      "sheet-results",
      expect.objectContaining({
        UserId: "demo-user",
        PassFail: "Pass",
      }),
    );
  });

  it("creates a forms submission and attaches uploaded files", async () => {
    const response = await request(app)
      .post("/forms/submit")
      .field("submissionType", "Weekly Wound Rounds Checklist")
      .field("siteType", "SNF")
      .field("facilityName", "Oak Terrace")
      .field("caseId", "CASE-100")
      .field("notes", "Weekly packet ready for review.")
      .attach("attachments", Buffer.from("packet"), "packet.txt");

    expect(response.status).toBe(201);
    expect(response.body.smartsheetSynced).toBe(true);
    expect(smartsheetMock.addRowByColumnTitle).toHaveBeenCalledWith(
      "sheet-forms",
      expect.objectContaining({
        SubmissionType: "Weekly Wound Rounds Checklist",
        FacilityName: "Oak Terrace",
      }),
    );
    expect(smartsheetMock.attachFileToRow).toHaveBeenCalledTimes(1);
  });

  it("routes IVR events into the correct operational queue", async () => {
    const response = await request(app)
      .post("/ivr/events")
      .field("callId", "CALL-9")
      .field("callerType", "SNF nurse")
      .field("site", "Willow Ridge")
      .field("callbackNumber", "5551234567")
      .field("woundType", "Pressure")
      .field("redFlags", "fever, severe pain")
      .field("requestType", "Consult")
      .field("audioUrl", "https://example.com/audio/call-9.mp3");

    expect(response.status).toBe(201);
    expect(response.body.priority).toBe("Urgent");
    expect(response.body.assignedTo).toBe("Clinical Triage");
    expect(smartsheetMock.attachLinkToRow).toHaveBeenCalledWith(
      "sheet-ivr",
      "row-1",
      expect.objectContaining({
        url: "https://example.com/audio/call-9.mp3",
      }),
    );
  });

  it("handles the Smartsheet webhook verification handshake", async () => {
    const response = await request(app)
      .post("/smartsheet/webhook")
      .set("Smartsheet-Hook-Challenge", "challenge-token")
      .send({ webhookId: 44 });

    expect(response.status).toBe(200);
    expect(response.headers["smartsheet-hook-response"]).toBe("challenge-token");
    expect(response.body.challenge).toBe("challenge-token");
  });

  it("rejects non-admin sheet sharing and enforces role restrictions", async () => {
    const unauthorized = await request(app).post("/admin/share-sheet").send({
      sheetType: "forms",
      email: "ops@advancewoundbiologic.com",
      accessLevel: "EDITOR",
    });

    expect(unauthorized.status).toBe(401);

    const forbidden = await request(app)
      .post("/admin/share-sheet")
      .set("x-admin-key", "development-admin-key")
      .set("x-awb-role", "ops")
      .send({
        sheetType: "results",
        email: "ops@advancewoundbiologic.com",
        accessLevel: "EDITOR",
      });

    expect(forbidden.status).toBe(403);
    expect(smartsheetMock.shareSheet).not.toHaveBeenCalled();
  });

  it("returns public certificate verification data and logs the lookup", async () => {
    dbMock.query.mockResolvedValueOnce([
      {
        certificate_id: "AWB-AWC-SG-PROV-20260303-6F2A9C",
        user_id: "demo-user",
        learner_full_name: "Izzy Example",
        learner_email: "izzy@example.com",
        track: "Provider Track",
        course_track: "Provider Track",
        track_id: "providers",
        course_title: "Advanced Wound Care & Skin Grafting",
        completion_date: "2026-03-03",
        module_id: "P-FINAL",
        score: 96,
        score_final_exam: 96,
        status: "valid",
        issued_at: "2026-03-03T12:00:00.000Z",
        revoked_at: null,
        revoked_reason: null,
        pdf_url: null,
      },
    ]);

    const response = await request(app).get("/api/verify/AWB-AWC-SG-PROV-20260303-6F2A9C");

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(true);
    expect(response.body.certificate.course_title).toBe("Advanced Wound Care & Skin Grafting");
    expect(dbMock.insertVerificationLookup).toHaveBeenCalledTimes(1);
  });
});

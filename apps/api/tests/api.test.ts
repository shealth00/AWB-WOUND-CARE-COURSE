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
  getSheet: vi.fn(),
  getSmartsheetHealthReport: vi.fn(),
  isSmartsheetConfigured: vi.fn(),
  shareSheet: vi.fn(),
  updateRowByColumnTitle: vi.fn(),
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
  smartsheetMock.getSheet.mockResolvedValue({
    name: "AWB Sheet",
    columns: [],
    rows: [],
  });
  smartsheetMock.getSmartsheetHealthReport.mockResolvedValue({
    configured: true,
    ok: true,
    missingKeys: [],
    sheetChecks: {
      catalog: { ok: true, sheetId: "sheet-catalog", error: null },
      questionBank: { ok: true, sheetId: "sheet-questionbank", error: null },
      results: { ok: true, sheetId: "sheet-results", error: null },
      forms: { ok: true, sheetId: "sheet-forms", error: null },
      ivr: { ok: true, sheetId: "sheet-ivr", error: null },
    },
  });
  smartsheetMock.isSmartsheetConfigured.mockReturnValue(true);
  smartsheetMock.updateRowByColumnTitle.mockResolvedValue(undefined);
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
  it("returns sanitized health status with latest sync metadata", async () => {
    dbMock.query.mockResolvedValueOnce([
      {
        created_at: "2026-03-03T08:00:00.000Z",
        status: "success",
      },
    ]);

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.service).toBe("api");
    expect(response.body.version).toBe("0.1.0");
    expect(response.body.dependencies.smartsheet).toBe("ok");
    expect(response.body.latestSync.status).toBe("success");
    expect(response.body.env).toBeUndefined();
    expect(response.body.baseUrl).toBeUndefined();
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

  it("scores and generates an audit-ready wound note", async () => {
    const response = await request(app).post("/tools/wound-audit/generate").send({
      diagnosis: "E11.621 / L97.412",
      location: "Right plantar forefoot",
      lengthCm: 3.2,
      widthCm: 2.1,
      depthCm: 0.4,
      necroticTissue: "30% necrotic tissue",
      procedure: "Selective sharp debridement",
      tissueRemoved: "Devitalized subcutaneous tissue",
      postProcedureStatus: "Healthy granulation visible",
      followUpPlan: "Return in 7 days",
    });

    expect(response.status).toBe(200);
    expect(response.body.score.score).toBe(100);
    expect(response.body.score.risk).toBe("LOW");
    expect(response.body.note).toContain("Diagnosis: E11.621 / L97.412");
    expect(response.body.note).toContain("Size (cm): 3.2 x 2.1 x 0.4");
  });

  it("scores and generates a debridement note with CPT suggestion", async () => {
    const response = await request(app).post("/tools/debridement/generate").send({
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
      postProcedureStatus: "Healthy granulation tissue exposed",
      followUpPlan: "Weekly wound evaluation",
    });

    expect(response.status).toBe(200);
    expect(response.body.suggestedCpt).toBe("11042");
    expect(response.body.score.score).toBe(100);
    expect(response.body.note).toContain("Suggested CPT: 11042");
  });

  it("evaluates escalation and CTP eligibility from objective trends", async () => {
    const response = await request(app).post("/tools/escalation/evaluate").send({
      weeksOfTreatment: 5,
      initialAreaSqCm: 10,
      currentAreaSqCm: 8.2,
      infectionPresent: false,
      necroticTissuePresent: false,
      standardCareCompleted: true,
    });

    expect(response.status).toBe(200);
    expect(response.body.percentAreaReduction).toBe(18);
    expect(response.body.recommendationCode).toBe("ESCALATE_ADVANCED_MODALITY");
    expect(response.body.graftRecommendation).toMatch(/CTP/i);
  });

  it("returns escalation module metadata", async () => {
    const response = await request(app).get("/modules/escalation-advanced-modalities");

    expect(response.status).toBe(200);
    expect(response.body.moduleId).toBe("CORE-4");
    expect(response.body.lessons).toHaveLength(3);
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
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { module_id: "C1" },
        { module_id: "C2" },
        { module_id: "C3" },
        { module_id: "C4" },
        { module_id: "P1" },
        { module_id: "P2" },
        { module_id: "P3" },
        { module_id: "P4" },
        { module_id: "P5" },
        { module_id: "P6" },
        { module_id: "P7" },
        { module_id: "P8" },
        { module_id: "P9" },
        { module_id: "P10" },
      ])
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
      .field("submissionType", "Facility Escalation Packet")
      .field("siteType", "SNF")
      .field("facilityName", "Oak Terrace")
      .field("notes", "Weekly packet ready for review.")
      .attach("attachments", Buffer.from("packet"), "packet.txt");

    expect(response.status).toBe(201);
    expect(response.body.smartsheetSynced).toBe(true);
    expect(smartsheetMock.addRowByColumnTitle).toHaveBeenCalledWith(
      "sheet-forms",
      expect.objectContaining({
        SubmissionType: "Facility Escalation Packet",
        FacilityName: "Oak Terrace",
      }),
    );
    expect(response.body.caseId).toMatch(/^CASE-\d{8}-\d{4}$/);
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

  it("submits insurance verification intake and creates IVR queue records", async () => {
    const response = await request(app).post("/ivr/submit").send({
      requestSetup: {
        salesExecutive: "Alex Rep",
        requestType: "New Request",
      },
      facilityPhysician: {
        physicianName: "Dr. Jane",
        facilityName: "Willow Ridge",
        facilityAddress: "101 Main St",
        facilityCityStateZip: "Miami, FL 33101",
        phone: "5551234567",
        placeOfService: ["Nursing Facility (POS 32)"],
      },
      patient: {
        patientName: "John Doe",
      },
      insurance: {
        primary: {
          payerName: "Aetna",
          policyNumber: "POL-1000",
        },
      },
      products: {
        selected: ["Apligraf"],
        attemptAuthorizationIfNotCovered: true,
      },
      wounds: {
        woundTypes: ["DFU"],
      },
      authorization: {
        authorizedSignature: "Dr. Jane",
        signatureDate: "2026-03-06",
        consentConfirmed: true,
      },
      meta: {
        formVersion: "AWB-IVR-v1",
        generatedAt: "2026-03-06T00:00:00.000Z",
      },
    });

    expect(response.status).toBe(201);
    expect(response.body.caseId).toMatch(/^CASE-\d{8}-\d{4}$/);
    expect(response.body.priority).toBe("Routine");
    expect(response.body.assignedTo).toBe("Wound Navigator");
    expect(smartsheetMock.addRowByColumnTitle).toHaveBeenCalledWith(
      "sheet-forms",
      expect.objectContaining({
        SubmissionType: "General Intake / IVR Intake",
        FacilityName: "Willow Ridge",
      }),
    );
    expect(smartsheetMock.addRowByColumnTitle).toHaveBeenCalledWith(
      "sheet-ivr",
      expect.objectContaining({
        Site: "Willow Ridge",
        WoundType: "DFU",
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

  it("deletes an uploaded media asset and returns cleanup warning when file is missing", async () => {
    dbMock.query.mockResolvedValueOnce([
      {
        asset_id: "asset-123",
        media_type: "video",
        file_size: "2048",
        storage_path: "ab/asset-123.mp4",
        storage_name: "asset-123.mp4",
      },
    ]);

    const response = await request(app)
      .delete("/api/admin/assets/asset-123")
      .set("x-admin-key", "development-admin-key");

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(true);
    expect(response.body.assetId).toBe("asset-123");
    expect(response.body.fileDeleted).toBe(false);
    expect(response.body.warning).toMatch(/already missing/i);
    expect(dbMock.insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.delete-asset",
        entityType: "media_asset",
        entityId: "asset-123",
      }),
    );
  });

  it("returns 404 when deleting a media asset that does not exist", async () => {
    dbMock.query.mockResolvedValueOnce([]);

    const response = await request(app)
      .delete("/api/admin/assets/missing-asset")
      .set("x-admin-key", "development-admin-key");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Asset not found.");
  });

  it("validates required metadata for ad-hoc video generation requests", async () => {
    const response = await request(app)
      .post("/api/admin/videos/generate")
      .set("x-admin-key", "development-admin-key")
      .send({
        script: "[OPEN]\nExample narration script.",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Missing required generation fields/i);
  });

  it("queues lesson video generation and returns queued job metadata", async () => {
    dbMock.query
      .mockResolvedValueOnce([
        {
          lesson_id: "P9-L1",
          source_row_id: "row-99",
          lesson_title: "Infection, Biofilm, Inflammation — Lesson 3",
          module_title: "Infection, Biofilm, Inflammation",
          track: "Provider Track",
          owner: "AWB Academy",
        },
      ])
      .mockResolvedValueOnce([
        {
          job_id: "job-1",
          lesson_id: "P9-L1",
          source_row_id: "row-99",
          asset_id: null,
          status: "queued",
          voice_id: "Joanna",
          request_payload: {
            lessonId: "P9-L1",
            lessonTitle: "Infection, Biofilm, Inflammation — Lesson 3",
            moduleTitle: "Infection, Biofilm, Inflammation",
            track: "Provider Track",
            owner: "AWB Academy",
            script: "[OPEN] Example script",
            voiceId: "Joanna",
            updateLessonVideoUrl: true,
            syncSmartsheetVideoUrl: true,
          },
          warnings: [],
          error_message: null,
          created_by: "admin",
          started_at: null,
          completed_at: null,
          created_at: "2026-03-06T00:00:00.000Z",
        },
      ]);

    const response = await request(app)
      .post("/api/admin/videos/generate")
      .set("x-admin-key", "development-admin-key")
      .send({
        lessonId: "P9-L1",
        script:
          "[OPEN] This lesson explains how providers should identify stalled healing trends over time, compare objective measurements across serial visits, document infection and inflammation findings, and align treatment steps with medical necessity and payer-ready support language for advanced wound care workflows.",
      });

    expect(response.status).toBe(202);
    expect(response.body.jobId).toBe("job-1");
    expect(response.body.status).toBe("queued");
    expect(response.body.lessonId).toBe("P9-L1");
    expect(response.body.assetId).toBeUndefined();
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

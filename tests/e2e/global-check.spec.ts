import { expect, test, type Page } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:3101/mock-api";
const certificateId = "AWB-AWC-SG-PROV-20260303-6F2A9C";

const programCatalog = {
  portability: {
    scorm: ["SCORM 1.2", "SCORM 2004"],
    xapi: true,
  },
  latestLcdHandling: {
    strategy: "Identify MAC jurisdiction, retrieve the current LCD and article, and document to the recurring wound-care standard.",
    requiredSkills: [
      "Identify MAC jurisdiction",
      "Retrieve the controlling LCD and article",
      "Build documentation around measurement, tissue, infection, and plan of care",
    ],
  },
  certificateRequirements: [
    {
      id: "video-completion",
      description: "Watch at least 90% of each lesson before module completion is credited.",
    },
  ],
  tracks: [
    {
      id: "providers",
      code: "PROV",
      title: "Provider Track",
      catalogName: "Provider Track (Clinical + Documentation + Audit-Ready)",
      certificateTitle: "Advanced Wound Care & Skin Grafting",
      estimatedHours: "6-8 hours",
      outcomes: [
        "Perform advanced wound assessment",
        "Document and code with LCD-aligned specificity",
      ],
      moduleCount: 10,
      finalExamQuestions: 50,
      passScore: 80,
      requiresPracticalAssignment: true,
    },
  ],
  sharedCore: [
    {
      id: "core-1",
      title: "Medicare Coverage Logic",
      summary: "LCD, NCD, article, and documentation foundations.",
      lessons: [
        {
          id: "core-1-lesson-1",
          title: "How Medicare decides",
          durationMin: 10,
          format: "video",
        },
      ],
    },
  ],
  toolLibrary: [
    {
      id: "weekly-rounds",
      title: "AWB Weekly Wound Rounds Checklist",
      audience: "Facility",
      summary: "Standardize wound rounds, escalation, and missing-document review.",
      downloadUrl: "/downloads/awb-wound-documentation-pack.pdf",
      formRoute: "/forms",
      printFriendly: true,
    },
  ],
  documentationPack: {
    title: "AWB Wound Documentation Pack",
    summary: "Shared documentation language for clinic, facility, and ASC settings.",
    downloadUrl: "/downloads/awb-wound-documentation-pack.pdf",
    sourceReferences: ["AWB Dictation Guide", "LCD - Wound Care (L37166)"],
    fieldGroups: [
      {
        id: "barriers",
        title: "Barrier screening",
        fields: ["A1c", "vascular tests", "nutrition/labs", "smoking/alcohol counseling"],
      },
    ],
  },
};

const catalogPayload = {
  tracks: [
    {
      track: "Provider Track",
      module_id: "P1",
      module_title: "Advanced wound assessment",
      lesson_count: "2",
    },
  ],
  lessons: [
    {
      lesson_id: "LESSON-1",
      track: "Provider Track",
      module_id: "P1",
      module_title: "Advanced wound assessment",
      lesson_title: "Measure like an auditor will read it",
      duration_min: 8,
      owner: "AWB Faculty",
    },
  ],
};

async function mockApi(page: Page) {
  await page.route(`${apiBaseUrl}/**`, async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname.replace(/^\/mock-api/, "");
    const normalizedPath = pathname.replace(/^\/api/, "");

    if (normalizedPath === "/program/catalog") {
      await route.fulfill({ json: programCatalog });
      return;
    }

    if (normalizedPath === "/catalog") {
      await route.fulfill({ json: catalogPayload });
      return;
    }

    if (normalizedPath === "/lcd-updates") {
      await route.fulfill({
        json: {
          updates: [
            {
              id: "withdrawal-2026",
              date: "2026-01-01",
              title: "Unified DFU/VLU LCD rollout withdrawn",
              summary: "Coverage remains MAC-driven after the January 1, 2026 withdrawal.",
              impact: "Learners must work from their own MAC policy and supporting articles.",
            },
          ],
          strategy: programCatalog.latestLcdHandling,
        },
      });
      return;
    }

    if (normalizedPath === "/quiz") {
      await route.fulfill({
        json: {
          track: "Provider Track",
          moduleId: "P1",
          passingScore: 80,
          questions: [
            {
              id: "q1",
              question_type: "MCQ",
              stem: "What is the most defensible way to show wound progress over time?",
              options: [
                { key: "A", value: "Serial measurements with a consistent method" },
                { key: "B", value: "A general note that the wound looks better" },
              ],
              rationale: "Objective measurement trends support medical necessity.",
            },
          ],
        },
      });
      return;
    }

    if (normalizedPath === "/quiz/submit") {
      await route.fulfill({
        json: {
          attemptId: "attempt-1",
          attemptNumber: 1,
          score: 100,
          pass: true,
          correctAnswers: 1,
          totalQuestions: 1,
          certificateId,
          smartsheetSynced: true,
        },
      });
      return;
    }

    if (normalizedPath === "/forms/submit") {
      await route.fulfill({
        json: {
          submissionId: "FORM-1",
          status: "New",
          smartsheetSynced: true,
        },
      });
      return;
    }

    if (normalizedPath === "/completion/demo-user") {
      await route.fulfill({
        json: {
          userId: "demo-user",
          attempts: [
            {
              attempt_id: "attempt-1",
              track: "Provider Track",
              module_id: "P1",
              attempt_number: 1,
              score: 100,
              pass_fail: true,
              completed_at: "2026-03-03T12:00:00.000Z",
              certificate_id: certificateId,
            },
          ],
        },
      });
      return;
    }

    if (normalizedPath === `/verify/${certificateId}`) {
      await route.fulfill({
        json: {
          valid: true,
          certificate: {
            certificate_id: certificateId,
            user_id: "demo-user",
            learner_full_name: "Izz*** Exa***",
            track: "Provider Track",
            course_track: "Provider Track",
            track_id: "providers",
            module_id: "P1",
            score: 100,
            status: "valid",
            issued_at: "2026-03-03T12:00:00.000Z",
            completion_date: "2026-03-03",
            course_title: "Advanced Wound Care & Skin Grafting",
            issuer_name: "Advance Wound Biologic",
            pdf_url: null,
            report_problem_url: "mailto:support@advancewoundbiologic.com",
            verification_url: `https://www.advancewoundbiologic.com/verify/${certificateId}`,
            html_url: `https://www.advancewoundbiologic.com/api/certificates/${certificateId}/html`,
            qr_data_url: "data:image/png;base64,qr",
          },
        },
      });
      return;
    }

    if (normalizedPath === "/admin/dashboard") {
      await route.fulfill({
        json: {
          forms: [{ submission_id: "FORM-1", status: "New" }],
          ivr: [{ intake_id: "IVR-1", priority: "Urgent" }],
          webhooks: [{ webhook_event_id: "WH-1", event_type: "row.updated" }],
          syncRuns: [{ sync_run_id: "SYNC-1", source: "admin", status: "success" }],
        },
      });
      return;
    }

    if (normalizedPath === "/admin/forms") {
      await route.fulfill({
        json: {
          forms: [{ submission_id: "FORM-1", submission_type: "Facility Escalation Packet" }],
        },
      });
      return;
    }

    if (normalizedPath === "/admin/sync") {
      await route.fulfill({
        json: {
          source: "admin",
          catalogRows: 1,
          questionRows: 1,
        },
      });
      return;
    }

    if (normalizedPath === "/admin/share-sheet") {
      await route.fulfill({
        json: {
          shared: true,
          share: {
            id: "share-1",
          },
        },
      });
      return;
    }

    await route.fulfill({
      status: 404,
      json: { error: `Unhandled mock route: ${pathname}` },
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("runs the global UI check across catalog, quiz, forms, completion, verify, LCD updates, and admin", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Five LMS-ready learning paths" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("404");

  await page.getByRole("link", { name: "Quiz", exact: true }).click();
  await expect(page.locator("body")).toContainText("track");
  await expect(page.locator("body")).not.toContainText("404");

  await page.getByRole("link", { name: "Catalog", exact: true }).click();
  await page.getByRole("link", { name: "Start Quiz" }).click();
  await expect(page.getByRole("heading", { name: "Module quiz" })).toBeVisible();
  await page.getByLabel("A Serial measurements with a consistent method").check();
  await page.getByRole("button", { name: "Submit quiz" }).click();
  await expect(page.locator("body")).toContainText("Certificate issued");

  await page.getByRole("link", { name: "Forms", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Operational forms" })).toBeVisible();
  await page.getByLabel("Submission type").selectOption("Facility Escalation Packet");
  await page.getByLabel("Facility name").fill("Oak Terrace");
  await page.getByLabel("Case ID").fill("CASE-100");
  await page.getByLabel("Notes").fill("Weekly packet ready for review.");
  const formResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/mock-api/api/forms/submit") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Submit form" }).click();
  expect((await formResponse).ok()).toBeTruthy();
  await expect(page.locator("body")).toContainText("Submitted FORM-1");

  await page.getByRole("link", { name: "Completion", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Completion tracking" })).toBeVisible();
  await page.getByRole("button", { name: "Load attempts" }).click();
  await expect(page.getByRole("link", { name: certificateId })).toBeVisible();
  await page.getByRole("link", { name: certificateId }).click();

  await expect(page.getByText("Valid certificate")).toBeVisible();
  await expect(page.locator("body")).toContainText("Advanced Wound Care & Skin Grafting");

  await page.getByRole("link", { name: "LCD Updates", exact: true }).click();
  await expect(page.getByRole("heading", { name: "MAC-driven policy workflow" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("404");

  await page.getByRole("link", { name: "Admin", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Admin operations" })).toBeVisible();
  await page.getByRole("button", { name: "Load dashboard" }).click();
  await expect(page.locator("body")).toContainText("Recent sync runs");
  await page.getByRole("button", { name: "Force content sync" }).click();
  await expect(page.locator("body")).toContainText("Recent webhook events");
  await page.getByLabel("Staff email").fill("ops@advancewoundbiologic.com");
  await page.getByRole("button", { name: "Share sheet" }).click();
  await expect(page.getByLabel("Staff email")).toHaveValue("");
});

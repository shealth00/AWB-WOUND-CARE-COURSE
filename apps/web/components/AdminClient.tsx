"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../src/api";

interface DashboardResponse {
  forms: Array<Record<string, unknown>>;
  ivr: Array<Record<string, unknown>>;
  webhooks: Array<Record<string, unknown>>;
  syncRuns: Array<Record<string, unknown>>;
}

interface MediaAsset {
  assetId: string;
  title: string;
  description: string | null;
  mediaType: "video" | "audio" | "pdf";
  mimeType: string;
  fileSize: number;
  durationSec: number | null;
  pageCount: number | null;
  processingStatus: string;
  processingNotes: string | null;
  createdAt: string;
}

interface AdminCatalogResponse {
  lessons: CatalogLesson[];
}

interface LoginResponse {
  loggedIn: boolean;
  token: string;
  actor: string;
  role: "admin" | "ops";
  expiresInSec: number;
}

interface DiagnosticResult {
  endpoint: string;
  ok: boolean;
  status: number | null;
  latencyMs: number;
  detail: string;
}

interface ExperimentReportResponse {
  experimentId: string;
  name: string;
  status: string;
  hypothesis: string;
  qa: {
    overrideParam: string;
    debugParam: string;
  };
  variants: Array<{
    variantId: string;
    label: string;
    headline: string;
    impressions: number;
    impressionSessions: number;
    clicks: number;
    clickSessions: number;
    ctr: number;
  }>;
  totals: {
    impressionSessions: number;
    clickSessions: number;
    ctr: number;
  };
  recentEvents: Array<{
    variantId: string;
    eventType: string;
    sessionKey: string;
    userId: string | null;
    path: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
}

const ADMIN_TOKEN_KEY = "awb-admin-token";

type VideoGenerationStatus =
  | "queued"
  | "processing"
  | "rendering"
  | "uploading"
  | "completed"
  | "failed";

interface CatalogLesson {
  lesson_id: string;
  source_row_id: string | null;
  track: string;
  module_id: string;
  module_title: string;
  lesson_title: string;
  publish_status: string;
  video_url?: string | null;
}

interface VideoGenerationJob {
  jobId: string;
  lessonId: string | null;
  sourceRowId: string | null;
  assetId: string | null;
  assetContentUrl: string | null;
  status: VideoGenerationStatus;
  voiceId: string;
  warnings: string[];
  errorMessage: string | null;
  createdBy: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  payload: {
    lessonTitle: string | null;
    moduleTitle: string | null;
    track: string | null;
    owner: string | null;
    voiceEngine: string | null;
    renderWidth: number | null;
    renderHeight: number | null;
    renderFps: number | null;
    publishAfterGenerate: boolean | null;
    overwriteExistingVideo: boolean | null;
  };
}

function buildCanonicalPayload(lesson?: CatalogLesson): string {
  const payload = {
    lessonId: lesson?.lesson_id ?? "",
    voice: {
      provider: "aws-polly",
      voiceId: "Joanna",
      engine: "neural",
    },
    render: {
      width: 1920,
      height: 1080,
      fps: 30,
    },
    brand: {
      logoUrl: "https://cdn.example.com/brand/logo.png",
      primaryColor: "#0F3D75",
      accentColor: "#2E89FF",
      fontFamily: "Inter",
    },
    lessonMeta: {
      track: lesson?.track ?? "Provider Track",
      moduleTitle: lesson?.module_title ?? "Infection, Biofilm, Inflammation",
      lessonTitle: lesson?.lesson_title ?? "Lesson 3: Recognizing stalled healing",
    },
    slides: [
      {
        id: "s1",
        layout: "title",
        title: "Recognizing stalled healing",
        narration:
          "In this lesson, we will identify clinical signs that a wound has stopped progressing through normal healing.",
      },
      {
        id: "s2",
        layout: "bullets",
        title: "Three warning signs",
        bullets: [
          "Persistent inflammation",
          "Non-advancing wound edge",
          "Increase in exudate or odor",
        ],
        narration:
          "Three common warning signs include persistent inflammation, failure of the wound edge to advance, and a change in drainage or odor.",
      },
      {
        id: "s3",
        layout: "callout",
        title: "Documentation tip",
        callout: "Describe changes over time, not just one visit.",
        narration:
          "When documenting stalled healing, compare findings over time rather than describing a single encounter in isolation.",
      },
    ],
  };

  return JSON.stringify(payload, null, 2);
}

export function AdminClient() {
  const [token, setToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [role, setRole] = useState("admin");
  const [actor, setActor] = useState("awb-ops");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [forms, setForms] = useState<Array<Record<string, unknown>>>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [catalogLessons, setCatalogLessons] = useState<AdminCatalogResponse["lessons"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareSheetType, setShareSheetType] = useState("forms");
  const [busy, setBusy] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [diagnosticsBusy, setDiagnosticsBusy] = useState(false);
  const [experimentReport, setExperimentReport] = useState<ExperimentReportResponse | null>(null);
  const [experimentBusy, setExperimentBusy] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [videoJobs, setVideoJobs] = useState<VideoGenerationJob[]>([]);
  const [videoJobsBusy, setVideoJobsBusy] = useState(false);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [publishAfterGenerate, setPublishAfterGenerate] = useState(true);
  const [overwriteExistingVideo, setOverwriteExistingVideo] = useState(false);
  const [videoPayloadJson, setVideoPayloadJson] = useState(buildCanonicalPayload());
  const [lessonVideoTargetId, setLessonVideoTargetId] = useState("");
  const [lessonVideoFile, setLessonVideoFile] = useState<File | null>(null);
  const [lessonVideoBusy, setLessonVideoBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_TOKEN_KEY);

    if (saved) {
      setToken(saved);
    }
  }, []);

  function adminAuthHeaders() {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      return headers;
    }

    headers["x-admin-key"] = apiKey;
    headers["x-awb-role"] = role;
    headers["x-awb-actor"] = actor;
    return headers;
  }

  function adminHeaders() {
    return {
      "Content-Type": "application/json",
      ...adminAuthHeaders(),
    };
  }

  async function login() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(apiUrl("/admin/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          role,
          actor,
        }),
      });
      const payload = (await response.json()) as LoginResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error ?? "Admin login failed." : "Admin login failed.");
      }

      const loginPayload = payload as LoginResponse;
      setToken(loginPayload.token);
      setActor(loginPayload.actor);
      setRole(loginPayload.role);
      localStorage.setItem(ADMIN_TOKEN_KEY, loginPayload.token);
      setNotice(`Logged in as ${loginPayload.actor} (${loginPayload.role}).`);
      setPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Admin login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError(null);

    try {
      await fetch(apiUrl("/admin/logout"), {
        method: "POST",
      });
    } finally {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      setToken("");
      setDashboard(null);
      setForms([]);
      setExperimentReport(null);
      setNotice("Logged out.");
      setBusy(false);
    }
  }

  async function runSync() {
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(apiUrl("/admin/sync"), {
        method: "POST",
        headers: adminHeaders(),
      });

      if (!response.ok) {
        throw new Error("Content sync failed.");
      }

      await loadDashboard();
      setNotice("Catalog sync completed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Content sync failed.");
    }
  }

  async function runReset() {
    const confirmed = window.confirm(
      "Reset demo operational data and regenerate catalog/questions? This clears attempts, certificates, forms, IVR, and audit run history.",
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setNotice(null);

    try {
      const response = await fetch(apiUrl("/admin/reset"), {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          clearCatalog: true,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        seededLessons?: number;
        seededQuestions?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Reset failed.");
      }

      await loadDashboard();
      setExperimentReport(null);
      setNotice(
        `Reset complete. Seeded lessons: ${payload.seededLessons ?? 0}. Seeded questions: ${payload.seededQuestions ?? 0}.`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Reset failed.");
    }
  }

  async function loadDashboard() {
    setError(null);

    try {
      const [dashboardResponse, formsResponse, catalogResponse, assetsResponse, jobsResponse] = await Promise.all([
        fetch(apiUrl("/admin/dashboard"), {
          headers: adminHeaders(),
        }),
        fetch(apiUrl("/admin/forms"), {
          headers: adminHeaders(),
        }),
        fetch(apiUrl("/admin/catalog"), {
          headers: adminHeaders(),
        }),
        fetch(apiUrl("/admin/assets"), {
          headers: adminHeaders(),
        }),
        fetch(apiUrl("/admin/generate-lesson-video?limit=30"), {
          headers: adminHeaders(),
        }),
      ]);

      if (!dashboardResponse.ok || !formsResponse.ok || !catalogResponse.ok || !assetsResponse.ok || !jobsResponse.ok) {
        throw new Error("Admin lookup failed.");
      }

      const dashboardPayload = (await dashboardResponse.json()) as DashboardResponse;
      const formsPayload = (await formsResponse.json()) as { forms: Array<Record<string, unknown>> };
      const catalogPayload = (await catalogResponse.json()) as AdminCatalogResponse;
      const assetsPayload = (await assetsResponse.json()) as { assets: MediaAsset[] };
      const jobsPayload = (await jobsResponse.json()) as { jobs: VideoGenerationJob[] };

      setDashboard(dashboardPayload);
      setForms(formsPayload.forms);
      setCatalogLessons(catalogPayload.lessons);
      setMediaAssets(assetsPayload.assets);
      setVideoJobs(jobsPayload.jobs ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Admin lookup failed.");
    }
  }

  async function loadVideoJobs(limit = 30, silent = false) {
    if (!isAuthenticated) {
      return;
    }

    if (!silent) {
      setVideoJobsBusy(true);
    }

    try {
      const response = await fetch(apiUrl(`/admin/generate-lesson-video?limit=${limit}`), {
        headers: adminHeaders(),
      });
      const payload = (await response.json()) as { jobs?: VideoGenerationJob[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Video job lookup failed.");
      }

      setVideoJobs(payload.jobs ?? []);
    } catch (reason) {
      if (!silent) {
        setError(reason instanceof Error ? reason.message : "Video job lookup failed.");
      }
    } finally {
      if (!silent) {
        setVideoJobsBusy(false);
      }
    }
  }

  async function generateLessonVideo() {
    setError(null);
    setNotice(null);
    setGenerateBusy(true);

    try {
      const parsed = JSON.parse(videoPayloadJson) as Record<string, unknown>;

      if (selectedLessonId.trim() && typeof parsed.lessonId !== "string") {
        parsed.lessonId = selectedLessonId.trim();
      }

      parsed.publishAfterGenerate = publishAfterGenerate;
      parsed.overwriteExistingVideo = overwriteExistingVideo;

      const response = await fetch(apiUrl("/admin/generate-lesson-video"), {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(parsed),
      });
      const payload = (await response.json()) as {
        jobId?: string;
        lessonId?: string | null;
        status?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Video generation request failed.");
      }

      await loadVideoJobs();
      setNotice(
        `Video generation job queued: ${payload.jobId ?? "unknown"}${
          payload.lessonId ? ` for ${payload.lessonId}` : ""
        }.`,
      );
    } catch (reason) {
      const message =
        reason instanceof SyntaxError
          ? "Generation payload JSON is invalid."
          : reason instanceof Error
            ? reason.message
            : "Video generation request failed.";
      setError(message);
    } finally {
      setGenerateBusy(false);
    }
  }

  async function uploadLessonVideo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!isAuthenticated) {
      setError("Admin authentication is required to upload lesson videos.");
      return;
    }
    if (!lessonVideoTargetId) {
      setError("Select a lesson before uploading a video.");
      return;
    }
    if (!lessonVideoFile) {
      setError("Select a video file to upload.");
      return;
    }

    setLessonVideoBusy(true);

    try {
      const formData = new FormData();
      formData.append("file", lessonVideoFile);
      formData.append("title", `Lesson ${lessonVideoTargetId} video`);

      const uploadResponse = await fetch(apiUrl("/admin/assets/upload"), {
        method: "POST",
        headers: adminAuthHeaders(),
        body: formData,
      });

      const uploadPayload = (await uploadResponse.json()) as { assetId?: string; error?: string };
      if (!uploadResponse.ok || !uploadPayload.assetId) {
        throw new Error(uploadPayload.error ?? "Video upload failed.");
      }

      const videoUrl = apiUrl(`/assets/${encodeURIComponent(uploadPayload.assetId)}/content`);

      const attachResponse = await fetch(
        apiUrl(`/admin/lessons/${encodeURIComponent(lessonVideoTargetId)}/video-url`),
        {
          method: "PATCH",
          headers: adminHeaders(),
          body: JSON.stringify({
            videoUrl,
            overwriteExistingVideo: true,
            syncSmartsheet: true,
          }),
        },
      );

      const attachPayload = (await attachResponse.json()) as { error?: string };
      if (!attachResponse.ok) {
        throw new Error(attachPayload.error ?? "Failed to attach video to lesson.");
      }

      setNotice(`Uploaded and attached video to lesson ${lessonVideoTargetId}.`);
      setLessonVideoFile(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Lesson video upload failed.");
    } finally {
      setLessonVideoBusy(false);
    }
  }

  async function clearLessonVideo(lessonId: string) {
    setError(null);
    setNotice(null);

    if (!isAuthenticated) {
      setError("Admin authentication is required to delete lesson videos.");
      return;
    }

    const confirmed = window.confirm(`Remove the published video URL for lesson ${lessonId}?`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(apiUrl(`/admin/lessons/${encodeURIComponent(lessonId)}/video-url`), {
        method: "DELETE",
        headers: adminAuthHeaders(),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to clear lesson video URL.");
      }
      setNotice(`Cleared video URL for lesson ${lessonId}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to clear lesson video URL.");
    }
  }

  function applyLessonTemplate(lessonId: string) {
    const lesson = catalogLessons.find((item) => item.lesson_id === lessonId);
    if (!lesson) {
      return;
    }

    setSelectedLessonId(lesson.lesson_id);
    setVideoPayloadJson(buildCanonicalPayload(lesson));
    setNotice(`Loaded canonical payload template for ${lesson.lesson_id}.`);
  }

  async function shareCurrentSheet() {
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(apiUrl("/admin/share-sheet"), {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          sheetType: shareSheetType,
          email: shareEmail,
          accessLevel: "EDITOR",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Share failed.");
      }

      setShareEmail("");
      setNotice(`Sheet shared: ${shareSheetType}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Share failed.");
    }
  }

  async function updatePublishStatus(lessonId: string, publishStatus: "Published" | "Draft") {
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(apiUrl(`/admin/lessons/${encodeURIComponent(lessonId)}/publish`), {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ publishStatus }),
      });
      const payload = (await response.json()) as {
        error?: string;
        smartsheetSynced?: boolean;
        syncWarning?: string | null;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Publish status update failed.");
      }

      setCatalogLessons((current) =>
        current.map((lesson) =>
          lesson.lesson_id === lessonId
            ? { ...lesson, publish_status: publishStatus }
            : lesson,
        ),
      );
      setNotice(
        payload.smartsheetSynced
          ? `Lesson ${lessonId} set to ${publishStatus}.`
          : `Lesson ${lessonId} set to ${publishStatus}. ${payload.syncWarning ?? "Smartsheet sync warning."}`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Publish status update failed.");
    }
  }

  async function uploadAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setUploadingAsset(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(apiUrl("/admin/assets/upload"), {
        method: "POST",
        headers: adminAuthHeaders(),
        body: formData,
      });
      const payload = (await response.json()) as MediaAsset | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error ?? "Asset upload failed." : "Asset upload failed.");
      }

      setMediaAssets((current) => [payload as MediaAsset, ...current]);
      form.reset();
      setNotice("Asset uploaded and processed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Asset upload failed.");
    } finally {
      setUploadingAsset(false);
    }
  }

  async function runDiagnostics() {
    setDiagnosticsBusy(true);
    setError(null);
    setNotice(null);

    const endpoints = [
      "/health",
      "/catalog",
      "/quiz/config",
      "/experiments/catalog-hero/config",
      "/progress/path?userId=demo-user&track=Provider%20Track",
    ];

    try {
      const results = await Promise.all(
        endpoints.map(async (path): Promise<DiagnosticResult> => {
          const endpoint = apiUrl(path);
          const startedAt = performance.now();

          try {
            const response = await fetch(endpoint);
            const latencyMs = Math.round(performance.now() - startedAt);
            const detail = await readResponseDetail(response);

            return {
              endpoint,
              ok: response.ok,
              status: response.status,
              latencyMs,
              detail,
            };
          } catch (reason) {
            return {
              endpoint,
              ok: false,
              status: null,
              latencyMs: Math.round(performance.now() - startedAt),
              detail:
                reason instanceof Error
                  ? reason.message
                  : "Network request failed",
            };
          }
        }),
      );

      setDiagnostics(results);
      const failing = results.filter((result) => !result.ok);
      if (failing.length > 0) {
        setError(
          `Diagnostics found ${failing.length} failing endpoint(s).`,
        );
      } else {
        setNotice("Diagnostics passed for health/catalog/quiz-config/experiment/progress.");
      }
    } finally {
      setDiagnosticsBusy(false);
    }
  }

  async function loadExperimentReport() {
    setExperimentBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        apiUrl("/admin/experiments/report?experimentId=catalog-hero-v1"),
        {
          headers: adminHeaders(),
        },
      );
      const payload = (await response.json()) as ExperimentReportResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error ?? "Experiment report failed." : "Experiment report failed.");
      }

      setExperimentReport(payload as ExperimentReportResponse);
      setNotice("Experiment report loaded.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Experiment report failed.");
    } finally {
      setExperimentBusy(false);
    }
  }

  const isAuthenticated = Boolean(token || apiKey.trim());

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const interval = window.setInterval(() => {
      const hasActiveJob = videoJobs.some((job) =>
        ["queued", "processing", "rendering", "uploading"].includes(job.status),
      );
      if (hasActiveJob) {
        void loadVideoJobs(30, true);
      }
    }, 12000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isAuthenticated, videoJobs]);

  return (
    <div className="grid">
      <section className="hero">
        <h1>Admin operations</h1>
        <p className="muted">
          Manage sync, forms, IVR, sheet sharing, and demo reset from one panel.
        </p>
      </section>

      <section className="card">
        <h2>Admin login</h2>
        <div className="split">
          <label className="field">
            Admin email
            <input onChange={(event) => setEmail(event.target.value)} value={email} />
          </label>
          <label className="field">
            Password
            <input
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          <label className="field">
            Actor
            <input onChange={(event) => setActor(event.target.value)} value={actor} />
          </label>
          <label className="field">
            Role
            <select onChange={(event) => setRole(event.target.value)} value={role}>
              <option value="admin">admin</option>
              <option value="ops">ops</option>
            </select>
          </label>
        </div>
        <div className="actions">
          <button className="button" disabled={busy} onClick={() => void login()} type="button">
            Login
          </button>
          <button
            className="button secondary"
            disabled={!token || busy}
            onClick={() => void logout()}
            type="button"
          >
            Logout
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Legacy API key (optional)</h2>
        <div className="split">
          <label className="field">
            Admin API key
            <input onChange={(event) => setApiKey(event.target.value)} value={apiKey} />
          </label>
        </div>
      </section>

      <section className="card">
        <div className="actions">
          <button className="button" disabled={!isAuthenticated} onClick={() => void loadDashboard()} type="button">
            Load dashboard
          </button>
          <button className="button secondary" disabled={!isAuthenticated} onClick={() => void runSync()} type="button">
            Force content sync
          </button>
          <button className="button secondary" disabled={!isAuthenticated} onClick={() => void runReset()} type="button">
            Reset demo data
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Share operational sheet</h2>
        <div className="split">
          <label className="field">
            Sheet
            <select onChange={(event) => setShareSheetType(event.target.value)} value={shareSheetType}>
              <option value="forms">forms</option>
              <option value="ivr">ivr</option>
              <option value="results">results</option>
              <option value="catalog">catalog</option>
              <option value="questionbank">questionbank</option>
            </select>
          </label>
          <label className="field">
            Staff email
            <input onChange={(event) => setShareEmail(event.target.value)} value={shareEmail} />
          </label>
        </div>
        <div className="actions">
          <button className="button" disabled={!isAuthenticated} onClick={() => void shareCurrentSheet()} type="button">
            Share sheet
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Media upload (video/audio/PDF)</h2>
        <form onSubmit={uploadAsset}>
          <div className="split">
            <label className="field">
              Title
              <input name="title" placeholder="Optional: defaults to file name" />
            </label>
            <label className="field">
              Description
              <input name="description" placeholder="Optional description" />
            </label>
          </div>
          <label className="field">
            File
            <input accept="video/*,audio/*,application/pdf" name="file" required type="file" />
          </label>
          <div className="actions">
            <button className="button" disabled={!isAuthenticated || uploadingAsset} type="submit">
              {uploadingAsset ? "Uploading..." : "Upload asset"}
            </button>
            <a className="button secondary" href="/library">
              Open library viewer
            </a>
          </div>
        </form>
      </section>

      <section className="card">
        <details>
          <summary>Diagnostics (hidden)</summary>
          <p className="muted">
            Runs GET checks for `/api/health`, `/api/catalog`, `/api/quiz/config`, the hero experiment config, and a learner progression path.
          </p>
          <div className="actions">
            <button
              className="button secondary"
              disabled={diagnosticsBusy}
              onClick={() => void runDiagnostics()}
              type="button"
            >
              {diagnosticsBusy ? "Running..." : "Run diagnostics"}
            </button>
          </div>
          {diagnostics.length > 0 ? (
            <div className="stack" style={{ marginTop: 16 }}>
              {diagnostics.map((result) => (
                <div className="question" key={result.endpoint}>
                  <strong>{result.endpoint}</strong>
                  <div className={result.ok ? "status-good" : "status-bad"}>
                    {result.ok ? "OK" : "Fail"} / status{" "}
                    {result.status === null ? "n/a" : result.status} /{" "}
                    {result.latencyMs}ms
                  </div>
                  <div className="mono muted">{result.detail}</div>
                </div>
              ))}
            </div>
          ) : null}
        </details>
      </section>

      <section className="card">
        <h2>Experiment QA + troubleshooting</h2>
        <p className="muted">
          Load the homepage A/B test report, verify variant traffic, and use forced variants for debugging.
        </p>
        <div className="actions">
          <button
            className="button secondary"
            disabled={!isAuthenticated || experimentBusy}
            onClick={() => void loadExperimentReport()}
            type="button"
          >
            {experimentBusy ? "Loading..." : "Load experiment report"}
          </button>
          <a className="button secondary" href="/?abVariant=a&debug=1" target="_blank">
            Open variant A debug
          </a>
          <a className="button secondary" href="/?abVariant=b&debug=1" target="_blank">
            Open variant B debug
          </a>
        </div>
        <div className="stack" style={{ marginTop: 16 }}>
          <div className="question">
            <strong>Troubleshooting flow</strong>
            <div className="muted">
              1. Run diagnostics. 2. Open a forced variant with <span className="mono">?abVariant=a|b&amp;debug=1</span>. 3. Load the report and confirm impressions/clicks move.
            </div>
          </div>
          {experimentReport ? (
            <>
              <div className="question">
                <strong>{experimentReport.name}</strong>
                <div className="muted">{experimentReport.hypothesis}</div>
                <div className="muted">
                  Totals: {experimentReport.totals.impressionSessions} impression sessions /{" "}
                  {experimentReport.totals.clickSessions} click sessions / CTR {experimentReport.totals.ctr}%
                </div>
              </div>
              <div className="split">
                {experimentReport.variants.map((variant) => (
                  <div className="question" key={variant.variantId}>
                    <strong>
                      Variant {variant.variantId.toUpperCase()} / {variant.label}
                    </strong>
                    <div className="muted">{variant.headline}</div>
                    <div className="muted">
                      Impressions {variant.impressions} ({variant.impressionSessions} sessions)
                    </div>
                    <div className="muted">
                      CTA clicks {variant.clicks} ({variant.clickSessions} sessions)
                    </div>
                    <div className={variant.ctr >= 15 ? "status-good" : "status-warn"}>
                      CTR {variant.ctr}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="stack">
                {experimentReport.recentEvents.length > 0 ? (
                  experimentReport.recentEvents.slice(0, 8).map((event) => (
                    <div className="question" key={`${event.createdAt}-${event.sessionKey}-${event.eventType}`}>
                      <strong>
                        {event.eventType} / variant {event.variantId.toUpperCase()}
                      </strong>
                      <div className="mono muted">{event.sessionKey}</div>
                      <div className="muted">
                        {event.path ?? "no-path"} / {new Date(event.createdAt).toLocaleString()}
                      </div>
                      <div className="mono muted">{truncate(JSON.stringify(event.metadata))}</div>
                    </div>
                  ))
                ) : (
                  <div className="question">
                    <strong>No experiment events recorded yet.</strong>
                    <div className="muted">
                      Open the homepage with a forced variant and click a hero CTA to generate the first events.
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </section>

      {notice ? <div className="card status-good">{notice}</div> : null}
      {error ? <div className="card status-bad">{error}</div> : null}

      {dashboard ? (
        <>
          <section className="split">
            <DataCard title="Recent sync runs" rows={dashboard.syncRuns} />
            <DataCard title="Recent webhook events" rows={dashboard.webhooks} />
            <DataCard title="Recent IVR" rows={dashboard.ivr} />
            <DataCard title="Recent forms" rows={forms.length > 0 ? forms : dashboard.forms} />
          </section>
          <section className="card">
            <h2>Media assets</h2>
            <div className="stack">
              {mediaAssets.length > 0 ? (
                mediaAssets.slice(0, 100).map((asset) => (
                  <div className="question" key={asset.assetId}>
                    <strong>{asset.title}</strong>
                    <div className="muted">
                      {asset.mediaType.toUpperCase()} / {(asset.fileSize / (1024 * 1024)).toFixed(1)} MB /{" "}
                      {asset.processingStatus}
                    </div>
                    <div className="actions">
                      <a
                        className="button secondary"
                        href={apiUrl(`/assets/${encodeURIComponent(asset.assetId)}/content`)}
                        target="_blank"
                      >
                        Open
                      </a>
                      <a
                        className="button secondary"
                        href={`${apiUrl(`/assets/${encodeURIComponent(asset.assetId)}/content`)}?download=1`}
                        target="_blank"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted">No uploaded media assets yet.</div>
              )}
            </div>
          </section>
          <section className="card">
            <h2>Lesson publish controls</h2>
            <div className="stack">
              {catalogLessons.slice(0, 80).map((lesson) => (
                <div className="question" key={lesson.lesson_id}>
                  <strong>
                    {lesson.module_id} / {lesson.lesson_title}
                  </strong>
                  <div className="muted">
                    {lesson.track} / {lesson.publish_status}
                  </div>
                  <div className="actions">
                    <button
                      className="button secondary"
                      disabled={!isAuthenticated || lesson.publish_status === "Published"}
                      onClick={() => void updatePublishStatus(lesson.lesson_id, "Published")}
                      type="button"
                    >
                      Publish
                    </button>
                    <button
                      className="button secondary"
                      disabled={!isAuthenticated || lesson.publish_status === "Draft"}
                      onClick={() => void updatePublishStatus(lesson.lesson_id, "Draft")}
                      type="button"
                    >
                      Unpublish
                    </button>
                    <button
                      className="button secondary"
                      disabled={!isAuthenticated}
                      onClick={() => applyLessonTemplate(lesson.lesson_id)}
                      type="button"
                    >
                      Use in generator
                    </button>
                    <button
                      className="button secondary"
                      disabled={!isAuthenticated}
                      onClick={() => void clearLessonVideo(lesson.lesson_id)}
                      type="button"
                    >
                      Remove video
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="card">
            <h2>Upload lesson video</h2>
            <p className="muted">Upload an MP4 and attach it to a published lesson.</p>
            <form className="stack" onSubmit={uploadLessonVideo}>
              <label className="field">
                Target lesson
                <select onChange={(event) => setLessonVideoTargetId(event.target.value)} value={lessonVideoTargetId}>
                  <option value="">Select lesson</option>
                  {catalogLessons.slice(0, 200).map((lesson) => (
                    <option key={lesson.lesson_id} value={lesson.lesson_id}>
                      {lesson.lesson_id} / {lesson.lesson_title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Video file (MP4)
                <input
                  accept="video/mp4"
                  onChange={(event) => setLessonVideoFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
              <button className="button" disabled={!isAuthenticated || lessonVideoBusy} type="submit">
                {lessonVideoBusy ? "Uploading..." : "Upload and attach"}
              </button>
            </form>
          </section>
          <section className="card">
            <h2>Lesson video generator</h2>
            <p className="muted">
              Submit canonical JSON payloads to queue video generation jobs and auto-update lesson VideoUrl.
            </p>
            <div className="split">
              <label className="field">
                Target lesson (optional)
                <select onChange={(event) => setSelectedLessonId(event.target.value)} value={selectedLessonId}>
                  <option value="">Ad-hoc payload</option>
                  {catalogLessons.slice(0, 200).map((lesson) => (
                    <option key={lesson.lesson_id} value={lesson.lesson_id}>
                      {lesson.lesson_id} / {lesson.lesson_title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Publish after generate
                <input
                  checked={publishAfterGenerate}
                  onChange={(event) => setPublishAfterGenerate(event.target.checked)}
                  type="checkbox"
                />
              </label>
              <label className="field">
                Overwrite existing VideoUrl
                <input
                  checked={overwriteExistingVideo}
                  onChange={(event) => setOverwriteExistingVideo(event.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>
            <label className="field">
              Canonical payload JSON
              <textarea
                onChange={(event) => setVideoPayloadJson(event.target.value)}
                rows={16}
                style={{ fontFamily: "monospace", minHeight: 320 }}
                value={videoPayloadJson}
              />
            </label>
            <div className="actions">
              <button className="button secondary" onClick={() => setVideoPayloadJson(buildCanonicalPayload())} type="button">
                Reset template
              </button>
              <button className="button" disabled={!isAuthenticated || generateBusy} onClick={() => void generateLessonVideo()} type="button">
                {generateBusy ? "Queueing..." : "Generate lesson video"}
              </button>
              <button
                className="button secondary"
                disabled={!isAuthenticated || videoJobsBusy}
                onClick={() => void loadVideoJobs()}
                type="button"
              >
                {videoJobsBusy ? "Refreshing..." : "Refresh jobs"}
              </button>
            </div>
            <div className="stack" style={{ marginTop: 16 }}>
              {videoJobs.length > 0 ? (
                videoJobs.map((job) => (
                  <div className="question" key={job.jobId}>
                    <strong>
                      {job.jobId} / {job.status}
                    </strong>
                    <div className="muted">
                      Lesson: {job.lessonId ?? "ad-hoc"} / Voice: {job.voiceId} / Created:{" "}
                      {new Date(job.createdAt).toLocaleString()}
                    </div>
                    <div className="muted">
                      {job.payload.track ?? "N/A"} / {job.payload.moduleTitle ?? "N/A"} /{" "}
                      {job.payload.lessonTitle ?? "N/A"}
                    </div>
                    {job.errorMessage ? <div className="status-bad">{job.errorMessage}</div> : null}
                    {job.warnings.length > 0 ? (
                      <div className="muted">Warnings: {job.warnings.join(" | ")}</div>
                    ) : null}
                    <div className="actions">
                      <a
                        className="button secondary"
                        href={apiUrl(`/admin/generate-lesson-video/${encodeURIComponent(job.jobId)}`)}
                        target="_blank"
                      >
                        Open JSON
                      </a>
                      {job.assetContentUrl ? (
                        <a className="button secondary" href={apiUrl(job.assetContentUrl)} target="_blank">
                          Open video
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted">No generation jobs yet.</div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function DataCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
}) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="stack">
        {rows.length > 0 ? (
          rows.map((row, index) => (
            <pre className="question mono" key={`${title}-${index}`}>
              {JSON.stringify(row, null, 2)}
            </pre>
          ))
        ) : (
          <div className="muted">No records yet.</div>
        )}
      </div>
    </div>
  );
}

async function readResponseDetail(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    return truncate(JSON.stringify(payload ?? {}, null, 2));
  }

  const text = await response.text().catch(() => "");
  return truncate(text || `${response.status} ${response.statusText}`);
}

function truncate(value: string): string {
  return value.length > 700 ? `${value.slice(0, 700)}...` : value;
}

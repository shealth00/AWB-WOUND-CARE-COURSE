"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../src/api";

interface DashboardResponse {
  forms: Array<Record<string, unknown>>;
  ivr: Array<Record<string, unknown>>;
  webhooks: Array<Record<string, unknown>>;
  syncRuns: Array<Record<string, unknown>>;
}

interface LoginResponse {
  loggedIn: boolean;
  token: string;
  actor: string;
  role: "admin" | "ops";
  expiresInSec: number;
}

const ADMIN_TOKEN_KEY = "awb-admin-token";

export function AdminClient() {
  const [token, setToken] = useState("");
  const [apiKey, setApiKey] = useState("development-admin-key");
  const [role, setRole] = useState("admin");
  const [actor, setActor] = useState("awb-ops");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [forms, setForms] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareSheetType, setShareSheetType] = useState("forms");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_TOKEN_KEY);

    if (saved) {
      setToken(saved);
    }
  }, []);

  function adminHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
      return headers;
    }

    headers["x-admin-key"] = apiKey;
    headers["x-awb-role"] = role;
    headers["x-awb-actor"] = actor;
    return headers;
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
      const [dashboardResponse, formsResponse] = await Promise.all([
        fetch(apiUrl("/admin/dashboard"), {
          headers: adminHeaders(),
        }),
        fetch(apiUrl("/admin/forms"), {
          headers: adminHeaders(),
        }),
      ]);

      if (!dashboardResponse.ok || !formsResponse.ok) {
        throw new Error("Admin lookup failed.");
      }

      const dashboardPayload = (await dashboardResponse.json()) as DashboardResponse;
      const formsPayload = (await formsResponse.json()) as { forms: Array<Record<string, unknown>> };

      setDashboard(dashboardPayload);
      setForms(formsPayload.forms);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Admin lookup failed.");
    }
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

  const isAuthenticated = Boolean(token || apiKey);

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

      {notice ? <div className="card status-good">{notice}</div> : null}
      {error ? <div className="card status-bad">{error}</div> : null}

      {dashboard ? (
        <section className="split">
          <DataCard title="Recent sync runs" rows={dashboard.syncRuns} />
          <DataCard title="Recent webhook events" rows={dashboard.webhooks} />
          <DataCard title="Recent IVR" rows={dashboard.ivr} />
          <DataCard title="Recent forms" rows={forms.length > 0 ? forms : dashboard.forms} />
        </section>
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

"use client";

import { useState } from "react";
import { apiUrl } from "../src/api";

interface DashboardResponse {
  forms: Array<Record<string, unknown>>;
  ivr: Array<Record<string, unknown>>;
  webhooks: Array<Record<string, unknown>>;
  syncRuns: Array<Record<string, unknown>>;
}

export function AdminClient() {
  const [apiKey, setApiKey] = useState("development-admin-key");
  const [role, setRole] = useState("admin");
  const [actor, setActor] = useState("awb-ops");
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [forms, setForms] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareSheetType, setShareSheetType] = useState("forms");

  function adminHeaders() {
    return {
      "x-admin-key": apiKey,
      "x-awb-role": role,
      "x-awb-actor": actor,
      "Content-Type": "application/json",
    };
  }

  async function runSync() {
    setError(null);

    try {
      const response = await fetch(apiUrl("/admin/sync"), {
        method: "POST",
        headers: adminHeaders(),
      });

      if (!response.ok) {
        throw new Error("Content sync failed.");
      }

      await loadDashboard();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Content sync failed.");
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Share failed.");
    }
  }

  return (
    <div className="grid">
      <section className="hero">
        <h1>Admin operations</h1>
        <p className="muted">
          Admin endpoints use an API key plus role header. Use `ops` for forms and IVR sharing only,
          or `admin` for all operational sheets.
        </p>
      </section>

      <section className="card">
        <div className="split">
          <label className="field">
            Admin API key
            <input onChange={(event) => setApiKey(event.target.value)} value={apiKey} />
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
          <button className="button" onClick={() => void loadDashboard()} type="button">
            Load dashboard
          </button>
          <button className="button secondary" onClick={() => void runSync()} type="button">
            Force content sync
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
          <button className="button" onClick={() => void shareCurrentSheet()} type="button">
            Share sheet
          </button>
        </div>
      </section>

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

"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "../src/api";
import { fetchJson } from "../src/http";
import { UniversalVideoPlayer } from "./UniversalVideoPlayer";

type MediaType = "video" | "audio" | "pdf";

interface MediaAsset {
  assetId: string;
  title: string;
  description: string | null;
  mediaType: MediaType;
  mimeType: string;
  fileSize: number;
  durationSec: number | null;
  pageCount: number | null;
  processingStatus: string;
  processingNotes: string | null;
  createdAt: string;
}

interface MediaAssetListResponse {
  assets: MediaAsset[];
}

const ADMIN_TOKEN_KEY = "awb-admin-token";

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.error === "string" && record.error.trim().length > 0) {
      return record.error;
    }
    if (typeof record.message === "string" && record.message.trim().length > 0) {
      return record.message;
    }
  }

  return fallback;
}

export function MediaLibraryClient() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | MediaType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [actor, setActor] = useState("awb-ops");
  const [role, setRole] = useState("admin");
  const [uploading, setUploading] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_TOKEN_KEY);

    if (saved) {
      setToken(saved);
    }
  }, []);

  const isAuthenticated = Boolean(token || apiKey.trim());

  function adminAuthHeaders() {
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
      return headers;
    }

    if (apiKey.trim()) {
      headers["x-admin-key"] = apiKey.trim();
      headers["x-awb-role"] = role;
      headers["x-awb-actor"] = actor;
    }

    return headers;
  }

  async function loadAssets() {
    setLoading(true);
    setError(null);

    try {
      const payload = await fetchJson<MediaAssetListResponse>("/assets");
      setAssets(payload.assets);
      setSelectedAssetId((current) => {
        if (current && payload.assets.some((asset) => asset.assetId === current)) {
          return current;
        }
        return payload.assets[0]?.assetId ?? null;
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to load media library.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  const filteredAssets = useMemo(() => {
    if (typeFilter === "all") {
      return assets;
    }

    return assets.filter((asset) => asset.mediaType === typeFilter);
  }, [assets, typeFilter]);

  const selected =
    filteredAssets.find((asset) => asset.assetId === selectedAssetId) ?? filteredAssets[0] ?? null;
  const selectedContentUrl = selected
    ? apiUrl(`/assets/${encodeURIComponent(selected.assetId)}/content`)
    : null;

  async function uploadAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!isAuthenticated) {
      setError("Admin authentication is required to upload assets.");
      return;
    }

    setUploading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(apiUrl("/admin/assets/upload"), {
        method: "POST",
        headers: adminAuthHeaders(),
        body: formData,
      });

      const payload = (await response.json()) as MediaAsset | { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Asset upload failed."));
      }

      const created = payload as MediaAsset;
      const nextAssets = [created, ...assets];
      setAssets(nextAssets);
      setSelectedAssetId(created.assetId);
      setNotice("Asset uploaded successfully.");
      form.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Asset upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteSelectedAsset() {
    if (!selected) {
      return;
    }

    setError(null);
    setNotice(null);

    if (!isAuthenticated) {
      setError("Admin authentication is required to delete assets.");
      return;
    }

    const confirmed = window.confirm(`Delete media asset \"${selected.title}\"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeletingAsset(true);

    try {
      const response = await fetch(apiUrl(`/admin/assets/${encodeURIComponent(selected.assetId)}`), {
        method: "DELETE",
        headers: adminAuthHeaders(),
      });
      const payload = (await response.json()) as { deleted?: boolean; warning?: string | null; error?: string };

      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Asset delete failed."));
      }

      const nextAssets = assets.filter((asset) => asset.assetId !== selected.assetId);
      setAssets(nextAssets);
      setSelectedAssetId((current) => {
        if (current !== selected.assetId) {
          return current;
        }

        return nextAssets[0]?.assetId ?? null;
      });

      setNotice(payload.warning ? `Asset deleted with warning: ${payload.warning}` : "Asset deleted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Asset delete failed.");
    } finally {
      setDeletingAsset(false);
    }
  }

  if (loading) {
    return <div className="card">Loading media library...</div>;
  }

  return (
    <div className="grid">
      <section className="hero">
        <div className="pill">Video / Audio / PDF</div>
        <h1>Media library</h1>
        <p className="muted">
          Upload, preview, and manage library assets. Videos are streamed using a universal MP4-capable player.
        </p>
      </section>

      <section className="card">
        <h2>Admin auth for upload/delete</h2>
        <div className="split">
          <label className="field">
            Admin JWT token
            <input
              onChange={(event) => {
                const value = event.target.value;
                setToken(value);
                if (value.trim()) {
                  localStorage.setItem(ADMIN_TOKEN_KEY, value.trim());
                } else {
                  localStorage.removeItem(ADMIN_TOKEN_KEY);
                }
              }}
              placeholder="Paste token from /admin login"
              value={token}
            />
          </label>
          <label className="field">
            Legacy admin API key (optional)
            <input onChange={(event) => setApiKey(event.target.value)} value={apiKey} />
          </label>
          <label className="field">
            Role
            <select onChange={(event) => setRole(event.target.value)} value={role}>
              <option value="admin">admin</option>
              <option value="ops">ops</option>
            </select>
          </label>
          <label className="field">
            Actor
            <input onChange={(event) => setActor(event.target.value)} value={actor} />
          </label>
        </div>
        <div className="muted">{isAuthenticated ? "Authenticated for management actions." : "Read-only mode."}</div>
      </section>

      <section className="card">
        <h2>Upload asset</h2>
        <form onSubmit={uploadAsset}>
          <div className="split">
            <label className="field">
              Title
              <input name="title" placeholder="Optional title" />
            </label>
            <label className="field">
              Description
              <input name="description" placeholder="Optional description" />
            </label>
          </div>
          <label className="field">
            File
            <input accept="video/*,audio/*,application/pdf,.mp4" name="file" required type="file" />
          </label>
          <div className="actions">
            <button className="button" disabled={!isAuthenticated || uploading} type="submit">
              {uploading ? "Uploading..." : "Upload to library"}
            </button>
            <button className="button secondary" onClick={() => void loadAssets()} type="button">
              Refresh assets
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="actions">
          <label className="field" style={{ marginBottom: 0, minWidth: 240 }}>
            Asset type
            <select
              onChange={(event) => setTypeFilter(event.target.value as "all" | MediaType)}
              value={typeFilter}
            >
              <option value="all">All</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
        </div>
      </section>

      {notice ? <div className="card status-good">{notice}</div> : null}
      {error ? <div className="card status-bad">{error}</div> : null}

      <section className="split">
        <div className="card">
          <h2>Assets</h2>
          <div className="stack">
            {filteredAssets.length === 0 ? (
              <div className="muted">No assets uploaded yet.</div>
            ) : (
              filteredAssets.map((asset) => (
                <button
                  className="question"
                  key={asset.assetId}
                  onClick={() => setSelectedAssetId(asset.assetId)}
                  style={{
                    cursor: "pointer",
                    textAlign: "left",
                    borderColor:
                      selected?.assetId === asset.assetId ? "var(--accent)" : "var(--border)",
                  }}
                  type="button"
                >
                  <strong>{asset.title}</strong>
                  <div className="muted">
                    {asset.mediaType.toUpperCase()} / {(asset.fileSize / (1024 * 1024)).toFixed(1)} MB
                  </div>
                  <div className="muted">{new Date(asset.createdAt).toLocaleString()}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2>Viewer</h2>
          {selected && selectedContentUrl ? (
            <div className="stack">
              <div>
                <strong>{selected.title}</strong>
                <div className="muted">{selected.description ?? "No description."}</div>
                <div className="muted">
                  Status: {selected.processingStatus}
                  {selected.processingNotes ? ` (${selected.processingNotes})` : ""}
                </div>
                {selected.mediaType !== "pdf" && selected.durationSec ? (
                  <div className="muted">Duration: {Math.round(selected.durationSec)} sec</div>
                ) : null}
                {selected.mediaType === "pdf" && selected.pageCount ? (
                  <div className="muted">Pages: {selected.pageCount}</div>
                ) : null}
              </div>

              {selected.mediaType === "video" ? (
                <UniversalVideoPlayer
                  mimeType={selected.mimeType || "video/mp4"}
                  src={selectedContentUrl}
                  title={selected.title}
                />
              ) : null}

              {selected.mediaType === "audio" ? (
                <audio controls src={selectedContentUrl} style={{ width: "100%" }} />
              ) : null}

              {selected.mediaType === "pdf" ? (
                <iframe
                  src={selectedContentUrl}
                  style={{ width: "100%", minHeight: 640, border: "1px solid var(--border)" }}
                  title={selected.title}
                />
              ) : null}

              <div className="actions">
                <a className="button secondary" href={selectedContentUrl} rel="noreferrer" target="_blank">
                  Open in new tab
                </a>
                <a
                  className="button secondary"
                  href={`${selectedContentUrl}?download=1`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Download
                </a>
                <button
                  className="button secondary"
                  disabled={!isAuthenticated || deletingAsset}
                  onClick={() => void deleteSelectedAsset()}
                  style={{ background: "#f6dede", color: "#8f1f1f" }}
                  type="button"
                >
                  {deletingAsset ? "Deleting..." : "Delete asset"}
                </button>
              </div>
            </div>
          ) : (
            <div className="muted">Select an asset to play or view.</div>
          )}
        </div>
      </section>
    </div>
  );
}

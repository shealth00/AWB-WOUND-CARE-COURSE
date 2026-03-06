"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "../src/api";
import { fetchJson } from "../src/http";

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

export function MediaLibraryClient() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | MediaType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void fetchJson<MediaAssetListResponse>("/assets")
      .then((payload) => {
        setAssets(payload.assets);
        setSelectedAssetId((current) => current ?? payload.assets[0]?.assetId ?? null);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Failed to load media library."),
      )
      .finally(() => setLoading(false));
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

  if (loading) {
    return <div className="card">Loading media library...</div>;
  }

  if (error) {
    return <div className="card status-bad">{error}</div>;
  }

  return (
    <div className="grid">
      <section className="hero">
        <div className="pill">Video / Audio / PDF</div>
        <h1>Media library</h1>
        <p className="muted">
          Uploads are processed by the API and streamed through secure asset endpoints for in-app
          playback and viewing.
        </p>
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
                <video controls src={selectedContentUrl} style={{ width: "100%" }} />
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
                <a className="button secondary" href={selectedContentUrl} target="_blank">
                  Open in new tab
                </a>
                <a
                  className="button secondary"
                  href={`${selectedContentUrl}?download=1`}
                  target="_blank"
                >
                  Download
                </a>
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

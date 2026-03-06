"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../src/api";

function normalizeError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.error === "string" && record.error.trim().length > 0) {
    return record.error;
  }
  if (typeof record.reason === "string" && record.reason.trim().length > 0) {
    return record.reason;
  }
  if (typeof record.message === "string" && record.message.trim().length > 0) {
    return record.message;
  }

  return null;
}

export function ApiStatusBanner() {
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const endpoint = apiUrl("/health");

    void fetch(endpoint)
      .then(async (response) => {
        const payload = await response
          .json()
          .catch(async () => ({ message: await response.text() }));

        if (!response.ok) {
          const detail = normalizeError(payload) ?? `${response.status} ${response.statusText}`;
          throw new Error(detail);
        }
      })
      .then(() => setError(null))
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to reach service.",
        ),
      )
      .finally(() => setChecking(false));
  }, []);

  if (checking || !error) {
    return null;
  }

  return (
    <div className="api-banner status-bad" role="alert">
      Service temporarily unavailable: {error}
    </div>
  );
}

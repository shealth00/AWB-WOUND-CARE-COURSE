import { apiUrl } from "./api";

function normalizeDetail(payload: unknown): string | null {
  if (payload && typeof payload === "object") {
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
  }

  return null;
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const endpoint = apiUrl(path);
  let response: Response;

  try {
    response = await fetch(endpoint, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Network request failed";
    throw new Error(`API request failed at ${endpoint}: ${detail}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  let payload: unknown = null;

  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    const text = await response.text();
    payload = text ? { message: text } : null;
  }

  if (!response.ok) {
    const detail = normalizeDetail(payload);
    const suffix = detail ? `: ${detail}` : "";
    throw new Error(`API ${response.status} ${response.statusText} at ${endpoint}${suffix}`);
  }

  return payload as T;
}

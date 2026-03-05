import { webEnv } from "./env";

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const apiPath = normalizedPath.startsWith("/api/")
    ? normalizedPath
    : `/api${normalizedPath}`;

  return webEnv.apiBaseUrl ? `${webEnv.apiBaseUrl}${apiPath}` : apiPath;
}

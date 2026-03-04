import { webEnv } from "./env";

export function apiUrl(path: string): string {
  return `${webEnv.apiBaseUrl}${path}`;
}

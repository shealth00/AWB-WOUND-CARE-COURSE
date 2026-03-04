import { maskLearnerName } from "@awb/lms-core";
import { apiEnv } from "../env.js";

const lookupBuckets = new Map<string, number[]>();

export function enforceVerifyRateLimit(ipAddress: string): boolean {
  const now = Date.now();
  const windowStart = now - apiEnv.VERIFY_RATE_LIMIT_WINDOW_MS;
  const existing = lookupBuckets.get(ipAddress) ?? [];
  const recent = existing.filter((timestamp) => timestamp >= windowStart);

  if (recent.length >= apiEnv.VERIFY_RATE_LIMIT_MAX) {
    lookupBuckets.set(ipAddress, recent);
    return false;
  }

  recent.push(now);
  lookupBuckets.set(ipAddress, recent);
  return true;
}

export function getDisplayLearnerName(fullName: string, masked: boolean): string {
  return masked ? maskLearnerName(fullName) : fullName;
}


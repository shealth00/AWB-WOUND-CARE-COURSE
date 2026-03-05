import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { apiEnv } from "../env.js";

export interface AdminIdentity {
  actor: string;
  role: string;
}

interface AdminSessionPayload {
  sub: string;
  role: string;
  exp: number;
  v: 1;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const headerValue = req.get("x-admin-key");
  const bearerToken = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = bearerToken ?? headerValue;

  const sessionIdentity = token ? verifyAdminToken(token) : null;

  if (sessionIdentity) {
    (req as Request & { adminIdentity?: AdminIdentity }).adminIdentity = sessionIdentity;
    next();
    return;
  }

  if (token !== apiEnv.ADMIN_API_KEY) {
    res.status(401).json({
      error: "Admin API key required.",
    });
    return;
  }

  (req as Request & { adminIdentity?: AdminIdentity }).adminIdentity = {
    actor: req.get("x-awb-actor") ?? "admin",
    role: (req.get("x-awb-role") ?? "admin").toLowerCase(),
  };
  next();
}

export function getAdminIdentity(req: Request): AdminIdentity {
  const sessionIdentity = (req as Request & { adminIdentity?: AdminIdentity }).adminIdentity;

  if (sessionIdentity) {
    return sessionIdentity;
  }

  return {
    actor: req.get("x-awb-actor") ?? "admin",
    role: (req.get("x-awb-role") ?? "admin").toLowerCase(),
  };
}

export function issueAdminToken(identity: AdminIdentity, ttlSeconds = apiEnv.ADMIN_SESSION_TTL_SEC): string {
  const payload: AdminSessionPayload = {
    sub: identity.actor,
    role: identity.role,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    v: 1,
  };
  const payloadEncoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signToken(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export function verifyAdminToken(token: string): AdminIdentity | null {
  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [payloadEncoded, signature] = parts;

  if (!payloadEncoded || !signature) {
    return null;
  }

  const expectedSignature = signToken(payloadEncoded);
  const provided = Buffer.from(signature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  let payload: AdminSessionPayload;

  try {
    payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8")) as AdminSessionPayload;
  } catch {
    return null;
  }

  if (payload.v !== 1 || !payload.sub || !payload.role || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    actor: payload.sub,
    role: payload.role.toLowerCase(),
  };
}

export function assertShareRole(role: string, sheetType: string): void {
  const normalizedSheetType = sheetType.toLowerCase();

  if (role === "admin") {
    return;
  }

  if (role === "ops" && ["forms", "ivr"].includes(normalizedSheetType)) {
    return;
  }

  throw new Error(`Role "${role}" is not allowed to share the ${sheetType} sheet.`);
}

function signToken(payloadEncoded: string): string {
  return createHmac("sha256", apiEnv.ADMIN_API_KEY).update(payloadEncoded).digest("base64url");
}

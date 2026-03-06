import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { apiEnv } from "../env.js";

export interface AdminIdentity {
  actor: string;
  role: string;
}

export interface MemberIdentity {
  memberId: string;
  role: string;
  membershipStatus: string;
}

interface AdminSessionPayload {
  sub: string;
  role: string;
  exp: number;
  v: 1;
}

interface MemberSessionPayload {
  sub: string;
  role: string;
  membershipStatus: string;
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

export function requireMember(req: Request, res: Response, next: NextFunction): void {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const identity = token ? verifyMemberToken(token) : null;

  if (!identity) {
    res.status(401).json({ error: "Member authentication required." });
    return;
  }

  (req as Request & { memberIdentity?: MemberIdentity }).memberIdentity = identity;
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

export function getMemberIdentity(req: Request): MemberIdentity {
  const sessionIdentity = (req as Request & { memberIdentity?: MemberIdentity }).memberIdentity;

  if (!sessionIdentity) {
    return {
      memberId: "unknown",
      role: "member",
      membershipStatus: "active",
    };
  }

  return sessionIdentity;
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

export function issueMemberToken(
  identity: MemberIdentity,
  ttlSeconds = apiEnv.MEMBER_SESSION_TTL_SEC,
): string {
  const payload: MemberSessionPayload = {
    sub: identity.memberId,
    role: identity.role,
    membershipStatus: identity.membershipStatus,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    v: 1,
  };
  const payloadEncoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signTokenWithSecret(payloadEncoded, apiEnv.MEMBER_AUTH_SECRET);
  return `${payloadEncoded}.${signature}`;
}

export function verifyMemberToken(token: string): MemberIdentity | null {
  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [payloadEncoded, signature] = parts;

  if (!payloadEncoded || !signature) {
    return null;
  }

  const expectedSignature = signTokenWithSecret(payloadEncoded, apiEnv.MEMBER_AUTH_SECRET);
  const provided = Buffer.from(signature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  let payload: MemberSessionPayload;

  try {
    payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8")) as MemberSessionPayload;
  } catch {
    return null;
  }

  if (
    payload.v !== 1 ||
    !payload.sub ||
    !payload.role ||
    !payload.membershipStatus ||
    payload.exp < Math.floor(Date.now() / 1000)
  ) {
    return null;
  }

  return {
    memberId: payload.sub,
    role: payload.role.toLowerCase(),
    membershipStatus: payload.membershipStatus.toLowerCase(),
  };
}

export function hashMemberPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const derived = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt}$${derived}`;
}

export function verifyMemberPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");

  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, salt, expectedHash] = parts;

  if (!salt || !expectedHash) {
    return false;
  }

  const derived = scryptSync(password, salt, 64).toString("base64url");
  const provided = Buffer.from(derived, "utf8");
  const expected = Buffer.from(expectedHash, "utf8");

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
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
  return signTokenWithSecret(payloadEncoded, apiEnv.ADMIN_API_KEY);
}

function signTokenWithSecret(payloadEncoded: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadEncoded).digest("base64url");
}

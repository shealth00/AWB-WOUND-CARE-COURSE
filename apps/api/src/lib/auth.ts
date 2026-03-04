import type { NextFunction, Request, Response } from "express";
import { apiEnv } from "../env.js";

export interface AdminIdentity {
  actor: string;
  role: string;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const headerValue = req.get("x-admin-key");
  const bearerToken = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = headerValue ?? bearerToken;

  if (token !== apiEnv.ADMIN_API_KEY) {
    res.status(401).json({
      error: "Admin API key required.",
    });
    return;
  }

  next();
}

export function getAdminIdentity(req: Request): AdminIdentity {
  return {
    actor: req.get("x-awb-actor") ?? "admin",
    role: (req.get("x-awb-role") ?? "admin").toLowerCase(),
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

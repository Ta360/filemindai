import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { env } from "../config/env";

const COOKIE_NAME = "gdl_session";

function sign(value: string): string {
  const hmac = crypto.createHmac("sha256", env.sessionSecret).update(value).digest("hex");
  return `${value}.${hmac}`;
}

function verify(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", env.sessionSecret).update(value).digest("hex");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  return value;
}

export function setSessionCookie(res: Response, userId: string) {
  res.cookie(COOKIE_NAME, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME);
}

export interface AuthedRequest extends Request {
  userId?: string;
}

/** Resolves the session user if present, but does not reject anonymous requests. */
export function attachUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const raw = req.cookies?.[COOKIE_NAME];
  if (raw) {
    const userId = verify(raw);
    if (userId) req.userId = userId;
  }
  next();
}

/** Rejects requests without a valid session. Use for endpoints that require Drive/auth context. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: "NOT_AUTHENTICATED", message: "Please sign in with Google to continue." });
  }
  next();
}

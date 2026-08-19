import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const KNOWN_ERROR_MESSAGES: Record<string, { status: number; message: string }> = {
  NOT_CONNECTED: { status: 409, message: "Google Drive is not connected. Please connect your Google account." },
  GOOGLE_NOT_CONFIGURED: { status: 503, message: "Google Drive integration is not configured on the server yet." },
  OPENAI_NOT_CONFIGURED: { status: 503, message: "AI service is not configured on the server yet." },
  WEB_SEARCH_NOT_CONFIGURED: { status: 503, message: "Web search is not configured on the server yet." },
  NOT_AUTHENTICATED: { status: 401, message: "Please sign in with Google to continue." },
  YOUTUBE_NOT_CONFIGURED: { status: 503, message: "The YouTube agent is not configured on the server yet. Add YOUTUBE_API_KEY." },
  INSTAGRAM_NOT_CONFIGURED: { status: 503, message: "The Instagram agent is not configured on the server yet. Add INSTAGRAM_APP_ID/SECRET." },
  INSTAGRAM_NOT_CONNECTED: { status: 409, message: "Connect your Instagram account first." },
};

/** Maps internal error identifiers to safe, user-facing messages. Never leaks stack traces or raw provider errors. */
export function toSafeError(err: unknown): { status: number; code: string; message: string } {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message };
  }
  const key = err instanceof Error ? err.message : String(err);
  const providerStatus = (err as { status?: number })?.status;
  const providerCode = (err as { code?: string })?.code;

  if (KNOWN_ERROR_MESSAGES[key]) {
    return { status: KNOWN_ERROR_MESSAGES[key].status, code: key, message: KNOWN_ERROR_MESSAGES[key].message };
  }
  if (providerCode === "insufficient_quota") {
    return {
      status: 429,
      code: "INSUFFICIENT_QUOTA",
      message: "The AI provider account has no available quota. Please check its plan and billing details.",
    };
  }
  if (providerStatus === 429 || key.includes("HTTP_429") || key.toLowerCase().includes("rate limit")) {
    return { status: 429, code: "RATE_LIMITED", message: "The service is temporarily rate-limited. Please try again shortly." };
  }
  if (providerStatus === 404 || key.includes("404") || key.toLowerCase().includes("not found")) {
    return { status: 404, code: "NOT_FOUND", message: "I couldn't find a matching file." };
  }
  if (providerStatus === 403 || key.includes("403") || key.toLowerCase().includes("permission")) {
    return { status: 403, code: "PERMISSION_DENIED", message: "You don't have permission to access this file." };
  }
  return { status: 500, code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const safe = toSafeError(err);
  if (safe.status >= 500) {
    console.error("[server error]", err);
  }
  res.status(safe.status).json({ error: safe.code, message: safe.message });
}

export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

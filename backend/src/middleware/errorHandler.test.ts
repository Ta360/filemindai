import { describe, it, expect } from "vitest";
import { toSafeError, AppError } from "./errorHandler";

describe("toSafeError", () => {
  it("maps NOT_CONNECTED to a friendly Drive message", () => {
    const safe = toSafeError(new Error("NOT_CONNECTED"));
    expect(safe.status).toBe(409);
    expect(safe.message).toMatch(/not connected/i);
  });

  it("maps permission errors without leaking details", () => {
    const safe = toSafeError(new Error("Google API error: 403 insufficient permission"));
    expect(safe.status).toBe(403);
    expect(safe.message).not.toContain("Google API error");
  });

  it("falls back to a generic 500 for unknown errors and never echoes the raw message", () => {
    const safe = toSafeError(new Error("TypeError: cannot read property 'x' of undefined at /app/src/secret.ts:42"));
    expect(safe.status).toBe(500);
    expect(safe.message).not.toContain("secret.ts");
  });

  it("respects an explicit AppError", () => {
    const safe = toSafeError(new AppError(404, "FILE_NOT_FOUND", "I couldn't find a matching file."));
    expect(safe.status).toBe(404);
    expect(safe.code).toBe("FILE_NOT_FOUND");
  });

  it("maps OpenAI insufficient_quota errors to a billing-specific message", () => {
    const err = Object.assign(new Error("429 You exceeded your current quota"), { status: 429, code: "insufficient_quota" });
    const safe = toSafeError(err);
    expect(safe.status).toBe(429);
    expect(safe.code).toBe("INSUFFICIENT_QUOTA");
    expect(safe.message).toMatch(/quota|billing/i);
  });

  it("maps generic provider 429 status codes to RATE_LIMITED even without matching text", () => {
    const err = Object.assign(new Error("Too Many Requests"), { status: 429 });
    const safe = toSafeError(err);
    expect(safe.status).toBe(429);
    expect(safe.code).toBe("RATE_LIMITED");
  });
});

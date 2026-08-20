import { env, isCloudflareMode } from "../config/env";

/**
 * Single entry point every repository function goes through. In the
 * Cloudflare Container deployment (INTERNAL_DB_SECRET set), this makes a
 * real HTTPS call back to the Worker's own public domain
 * (INTERNAL_DB_URL, e.g. https://filemindai.org/__internal-db) — the
 * container has no direct D1/binding access, only the Worker runtime does
 * (see worker/src/index.ts). Everywhere else (local dev, the VPS
 * deployment), it runs the same operation against local SQLite directly,
 * so behavior is identical either way from repositories.ts's point of view.
 */
export async function dbCall<T = any>(op: string, args: unknown[]): Promise<T> {
  if (isCloudflareMode) {
    const res = await fetch(`${env.internalDbUrl}/${op}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Auth": env.internalDbSecret },
      body: JSON.stringify({ args }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`DB_OP_FAILED_${op}_${res.status}:${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }
  // Dynamic import: never touches (or creates) the local SQLite file when
  // running in Cloudflare mode.
  const { localOp } = await import("./opDispatch.local");
  return localOp<T>(op, args);
}

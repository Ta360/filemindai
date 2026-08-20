import { randomUUID } from "node:crypto";
import { env, isInstagramConfigured } from "../../config/env";
import { instagramTokensRepo, agentActivityRepo } from "../../database/repositories";
import type { InstagramMediaItem, InstagramStatus } from "../../../../shared/types";

// ---------------------------------------------------------------------------
// Instagram Graph API (Instagram Login), own connected account ONLY.
// There is no supported, ToS-compliant way to browse an arbitrary third-party
// user's photos by username — this service intentionally never accepts one.
// Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
// ---------------------------------------------------------------------------

const AUTHORIZE_URL = "https://api.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH_BASE = "https://graph.instagram.com";
const SCOPES = "instagram_business_basic";

// In-memory CSRF-state -> userId map for the short OAuth redirect round trip.
const pendingStates = new Map<string, { userId: string; expires: number }>();

function requireConfigured() {
  if (!isInstagramConfigured) throw new Error("INSTAGRAM_NOT_CONFIGURED");
}

export function buildAuthorizeUrl(userId: string): string {
  requireConfigured();
  const state = randomUUID();
  pendingStates.set(state, { userId, expires: Date.now() + 10 * 60 * 1000 });
  const params = new URLSearchParams({
    client_id: env.instagramAppId,
    redirect_uri: env.instagramRedirectUri,
    scope: SCOPES,
    response_type: "code",
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export function resolveState(state: string): string | null {
  const entry = pendingStates.get(state);
  pendingStates.delete(state);
  if (!entry || entry.expires < Date.now()) return null;
  return entry.userId;
}

export async function exchangeCodeForToken(code: string): Promise<{ accessToken: string; userId: string }> {
  requireConfigured();
  const form = new URLSearchParams({
    client_id: env.instagramAppId,
    client_secret: env.instagramAppSecret,
    grant_type: "authorization_code",
    redirect_uri: env.instagramRedirectUri,
    code,
  });
  const res = await fetch(TOKEN_URL, { method: "POST", body: form });
  if (!res.ok) throw new Error(`INSTAGRAM_TOKEN_HTTP_${res.status}`);
  const data = (await res.json()) as any;
  return { accessToken: data.access_token, userId: String(data.user_id) };
}

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: env.instagramAppSecret,
    access_token: shortLivedToken,
  });
  const res = await fetch(`${GRAPH_BASE}/access_token?${params.toString()}`);
  if (!res.ok) throw new Error(`INSTAGRAM_LONG_TOKEN_HTTP_${res.status}`);
  const data = (await res.json()) as any;
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function connectAccount(appUserId: string, code: string) {
  const { accessToken: shortLived, userId: igUserId } = await exchangeCodeForToken(code);
  const { accessToken: longLived, expiresIn } = await exchangeForLongLivedToken(shortLived);

  const profileRes = await fetch(`${GRAPH_BASE}/me?fields=id,username&access_token=${longLived}`);
  const profile = profileRes.ok ? ((await profileRes.json()) as any) : { username: null };

  await instagramTokensRepo.save(appUserId, {
    accessToken: longLived,
    instagramUserId: igUserId,
    username: profile.username ?? null,
    expiryDate: Date.now() + expiresIn * 1000,
  });
}

export async function getStatus(appUserId: string): Promise<InstagramStatus> {
  const tokens = await instagramTokensRepo.get(appUserId);
  if (!tokens) return { connected: false };
  return { connected: true, username: tokens.username ?? undefined };
}

export async function disconnect(appUserId: string) {
  await instagramTokensRepo.clear(appUserId);
}

/** Fetches the connected user's own recent media — never a third party's. */
export async function getOwnMedia(appUserId: string): Promise<InstagramMediaItem[]> {
  const tokens = await instagramTokensRepo.get(appUserId);
  if (!tokens) throw new Error("INSTAGRAM_NOT_CONNECTED");

  const params = new URLSearchParams({
    fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
    access_token: tokens.accessToken,
    limit: "24",
  });
  const res = await fetch(`${GRAPH_BASE}/me/media?${params.toString()}`);
  if (!res.ok) throw new Error(`INSTAGRAM_MEDIA_HTTP_${res.status}`);
  const data = (await res.json()) as any;

  const media: InstagramMediaItem[] = (data.data ?? []).map((m: any) => ({
    id: m.id,
    caption: m.caption ?? null,
    mediaType: m.media_type,
    mediaUrl: m.media_url,
    thumbnailUrl: m.thumbnail_url ?? null,
    permalink: m.permalink,
    timestamp: m.timestamp,
  }));

  await agentActivityRepo.add(appUserId, {
    agent: "instagram",
    action: "view_media",
    topic: tokens.username ?? "my_account",
    resultCount: media.length,
  });

  return media;
}

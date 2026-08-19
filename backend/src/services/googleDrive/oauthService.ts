import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { env, isGoogleConfigured } from "../../config/env";
import { tokensRepo, usersRepo } from "../../database/repositories";

// Minimum scopes required: read-only Drive metadata/content + basic profile
// to identify the user. Do NOT request broader scopes than this.
export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export function createOAuthClient(): OAuth2Client {
  if (!isGoogleConfigured) {
    throw new Error("GOOGLE_NOT_CONFIGURED");
  }
  return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, env.googleRedirectUri);
}

export function getAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: DRIVE_SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ auth: client, version: "v2" });
  const { data: profile } = await oauth2.userinfo.get();

  if (!profile.id || !profile.email) {
    throw new Error("GOOGLE_PROFILE_INCOMPLETE");
  }

  usersRepo.upsert(profile.id, profile.email, profile.name ?? profile.email);
  tokensRepo.save(profile.id, {
    accessToken: tokens.access_token ?? null,
    refreshToken: tokens.refresh_token ?? null,
    scope: tokens.scope ?? null,
    tokenType: tokens.token_type ?? null,
    expiryDate: tokens.expiry_date ?? null,
  });

  return { userId: profile.id, email: profile.email, name: profile.name ?? profile.email };
}

/**
 * Returns an authenticated OAuth2 client for a user, refreshing the access
 * token when Google reports it as expired. Throws NOT_CONNECTED if the user
 * has never completed the OAuth flow.
 */
export async function getAuthorizedClient(userId: string): Promise<OAuth2Client> {
  const stored = tokensRepo.get(userId);
  if (!stored || !stored.refreshToken) {
    throw new Error("NOT_CONNECTED");
  }

  const client = createOAuthClient();
  client.setCredentials({
    access_token: stored.accessToken ?? undefined,
    refresh_token: stored.refreshToken,
    scope: stored.scope ?? undefined,
    token_type: stored.tokenType ?? undefined,
    expiry_date: stored.expiryDate ?? undefined,
  });

  client.on("tokens", (tokens) => {
    tokensRepo.save(userId, {
      accessToken: tokens.access_token ?? stored.accessToken,
      refreshToken: tokens.refresh_token ?? stored.refreshToken,
      scope: tokens.scope ?? stored.scope,
      tokenType: tokens.token_type ?? stored.tokenType,
      expiryDate: tokens.expiry_date ?? stored.expiryDate,
    });
  });

  return client;
}

export function isConnected(userId: string): boolean {
  const stored = tokensRepo.get(userId);
  return Boolean(stored?.refreshToken);
}

export function disconnect(userId: string) {
  tokensRepo.clear(userId);
}

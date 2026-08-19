import "dotenv/config";

function required(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  frontendUrl: required("FRONTEND_URL", "http://localhost:5173"),
  sessionSecret: required("SESSION_SECRET", "dev-insecure-secret-change-me"),

  openaiApiKey: required("OPENAI_API_KEY"),
  openaiModel: required("OPENAI_MODEL", "gpt-4o-mini"),

  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: required("GOOGLE_REDIRECT_URI", "http://localhost:4000/api/auth/callback"),

  webSearchProvider: required("WEB_SEARCH_PROVIDER", "none"),
  searchApiKey: required("SEARCH_API_KEY"),

  databaseUrl: required("DATABASE_URL", "./data/app.db"),

  // YouTube Data API v3 — https://console.cloud.google.com/apis/library/youtube.googleapis.com
  youtubeApiKey: required("YOUTUBE_API_KEY"),

  // Instagram Graph API (own connected Business/Creator account only — never arbitrary usernames)
  instagramAppId: required("INSTAGRAM_APP_ID"),
  instagramAppSecret: required("INSTAGRAM_APP_SECRET"),
  instagramRedirectUri: required("INSTAGRAM_REDIRECT_URI", "http://localhost:4000/api/agents/instagram/callback"),

  // Local Python/Flask + Matplotlib microservice (see charts-service/)
  chartServiceUrl: required("CHART_SERVICE_URL", "http://localhost:5001"),
};

export const isGoogleConfigured = Boolean(env.googleClientId && env.googleClientSecret);
export const isOpenAIConfigured = Boolean(env.openaiApiKey);
export const isWebSearchConfigured = env.webSearchProvider !== "none" && Boolean(env.searchApiKey);
export const isYoutubeConfigured = Boolean(env.youtubeApiKey);
export const isInstagramConfigured = Boolean(env.instagramAppId && env.instagramAppSecret);

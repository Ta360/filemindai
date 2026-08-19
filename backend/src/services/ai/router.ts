import type { QueryIntent } from "../../../../shared/types";

export interface RouteResult {
  intent: QueryIntent;
  /** true when routing was decided deterministically (slash command), not by the LLM */
  deterministic: boolean;
  /** normalized query text with the slash command stripped, if any */
  cleanedQuery: string;
}

const SLASH_COMMANDS: Record<string, QueryIntent> = {
  "/folders": "DRIVE_FOLDER_SEARCH",
  "/files": "DRIVE_SEARCH",
  "/images": "IMAGE_PREVIEW",
  "/videos": "VIDEO_PREVIEW",
  "/recent": "DRIVE_SEARCH",
  "/search": "DRIVE_SEARCH",
  "/help": "GENERAL",
};

/**
 * Deterministic safeguard layer: slash commands always resolve to a fixed
 * intent regardless of what the LLM would classify them as. This runs BEFORE
 * any LLM call so `/folders` etc. are 100% reliable and cost nothing.
 */
export function routeDeterministic(rawQuery: string): RouteResult | null {
  const trimmed = rawQuery.trim();
  const [command, ...rest] = trimmed.split(/\s+/);
  const lower = command?.toLowerCase();

  if (lower && SLASH_COMMANDS[lower]) {
    return {
      intent: SLASH_COMMANDS[lower],
      deterministic: true,
      cleanedQuery: rest.join(" ").trim(),
    };
  }
  return null;
}

export const INTENT_LIST: QueryIntent[] = [
  "DRIVE_SEARCH",
  "DRIVE_FOLDER_SEARCH",
  "WEB_SEARCH",
  "FILE_OPEN",
  "IMAGE_PREVIEW",
  "VIDEO_PREVIEW",
  "ANALYTICS",
  "HISTORY",
  "GENERAL",
];

export const HELP_TEXT = `**Available commands**

- \`/folders\` — show your Google Drive folders
- \`/files\` — show your Google Drive files
- \`/images\` — show image files
- \`/videos\` — show video files
- \`/recent\` — show recently modified files
- \`/search <query>\` — search Drive for a query
- \`/help\` — show this message

You can also just ask naturally, e.g. "Find my resume", "Show files by type", "What's the latest AI news?"`;

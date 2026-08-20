import type OpenAI from "openai";
import * as driveService from "../googleDrive/driveService";
import { webSearchService } from "../webSearch/webSearchService";
import { buildAnalytics } from "../analytics/analyticsService";
import { historyRepo, activityRepo } from "../../database/repositories";

// ---------------------------------------------------------------------------
// Tool/function-call schemas exposed to the OpenAI model. Each maps 1:1 to a
// backend capability — the model never fabricates file IDs or URLs, it only
// asks us to run these and we return real structured data.
// ---------------------------------------------------------------------------
export const toolDefinitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_drive",
      description: "Search the user's Google Drive for files (not folders). Use for requests to find/open/show documents, PDFs, spreadsheets, images, videos, etc.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text search term to match against file names, e.g. 'resume'. Omit for broad type-only filters." },
          mimeTypeGroup: { type: "string", enum: ["pdf", "document", "spreadsheet", "presentation", "image", "video", "audio"] },
          parentFolderName: { type: "string", description: "Restrict to files inside a folder with this name, if the user mentioned one." },
          modifiedAfter: { type: "string", description: "ISO date string; only files modified after this date." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_folders",
      description: "Search or list the user's Google Drive folders.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text folder name search term. Omit to list all folders." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_file_metadata",
      description: "Get full metadata for a specific Drive file by its ID.",
      parameters: {
        type: "object",
        properties: { fileId: { type: "string" } },
        required: ["fileId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Perform a live web search for general knowledge, current events, or anything not related to the user's Google Drive.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_drive_analytics",
      description: "Compute chart-ready analytics (files by type/folder/month) from a Drive search. Use when the user asks for a chart, breakdown, or statistics of their files.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Optional search term to scope the analytics to." },
          mimeTypeGroup: { type: "string", enum: ["pdf", "document", "spreadsheet", "presentation", "image", "video", "audio"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_search_history",
      description: "Retrieve the user's recent search history.",
      parameters: { type: "object", properties: { limit: { type: "number" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "get_calendar_activity",
      description: "Retrieve the user's Drive-related activity log for a date range (e.g. 'today').",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "ISO date, inclusive." },
          endDate: { type: "string", description: "ISO date, inclusive." },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
];

async function resolveFolderIdByName(userId: string, name: string): Promise<string | undefined> {
  const { folders } = await driveService.searchFolders(userId, { query: name, pageSize: 1 });
  return folders[0]?.id;
}

export interface ToolExecutionContext {
  userId: string;
}

export async function executeTool(name: string, args: any, ctx: ToolExecutionContext): Promise<any> {
  switch (name) {
    case "search_drive": {
      const parentFolderId = args.parentFolderName ? await resolveFolderIdByName(ctx.userId, args.parentFolderName) : undefined;
      const { files, nextPageToken } = await driveService.searchFiles(ctx.userId, {
        query: args.query,
        mimeTypeGroup: args.mimeTypeGroup,
        parentFolderId,
        modifiedAfter: args.modifiedAfter,
      });
      return { files, nextPageToken };
    }
    case "search_folders": {
      const { folders, nextPageToken } = await driveService.searchFolders(ctx.userId, { query: args.query, pageSize: 50 });
      return { folders, nextPageToken };
    }
    case "get_file_metadata": {
      return await driveService.getFileMetadata(ctx.userId, args.fileId);
    }
    case "search_web": {
      const results = await webSearchService.search(args.query);
      return { results };
    }
    case "get_drive_analytics": {
      const [{ files }, { folders }] = await Promise.all([
        driveService.searchFiles(ctx.userId, { query: args.query, mimeTypeGroup: args.mimeTypeGroup, pageSize: 200 }),
        driveService.searchFolders(ctx.userId, { pageSize: 100 }),
      ]);
      return buildAnalytics(files, folders.length);
    }
    case "get_search_history": {
      return { entries: await historyRepo.list(ctx.userId, args.limit ?? 50) };
    }
    case "get_calendar_activity": {
      return { entries: await activityRepo.listRange(ctx.userId, args.startDate, args.endDate) };
    }
    default:
      throw new Error(`UNKNOWN_TOOL_${name}`);
  }
}

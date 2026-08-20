import OpenAI from "openai";
import { env, isOpenAIConfigured } from "../../config/env";
import { toolDefinitions, executeTool } from "./tools";
import { routeDeterministic, HELP_TEXT } from "./router";
import { chatRepo, historyRepo, activityRepo } from "../../database/repositories";
import * as driveService from "../googleDrive/driveService";
import { buildAnalytics } from "../analytics/analyticsService";
import type {
  AIResponse,
  DriveFile,
  DriveFolder,
  WebSearchResult,
  ChartData,
  QueryIntent,
  AIAction,
} from "../../../../shared/types";

const SYSTEM_PROMPT = `You are the AI Assistant inside "Google Drive LLM", a dashboard that lets a user search and open their own Google Drive with natural language, and answer general questions with live web search.

Rules:
- If the request is about the user's Drive (files, folders, documents, images, videos, "open X", "find X"), call search_drive / search_folders / get_file_metadata.
- If the request is general knowledge, current events, or anything not about the user's own Drive, call search_web. Never claim to have current information unless you actually called search_web.
- If the request asks for a chart/breakdown/statistics of files, call get_drive_analytics.
- If the request asks about past searches or activity, call get_search_history or get_calendar_activity.
- Use conversation history to resolve references like "the second one", "that file", "the marketing folder we found".
- When multiple files could match, list them and ask the user to clarify rather than guessing.
- Keep answers concise, friendly, and factual. Use markdown for lists/emphasis.
- Never invent a file ID, URL, or web result. Only use IDs/URLs returned by tools.`;

function client(): OpenAI {
  if (!isOpenAIConfigured) throw new Error("OPENAI_NOT_CONFIGURED");
  return new OpenAI({ apiKey: env.openaiApiKey });
}

interface CollectedResults {
  files: DriveFile[];
  folders: DriveFolder[];
  webResults: WebSearchResult[];
  chartData: ChartData | null;
  calledTools: Set<string>;
}

function collectFromToolResult(collected: CollectedResults, name: string, result: any) {
  collected.calledTools.add(name);
  if (name === "search_drive" && result.files) collected.files.push(...result.files);
  if (name === "get_file_metadata" && result?.id) collected.files.push(result);
  if (name === "search_folders" && result.folders) collected.folders.push(...result.folders);
  if (name === "search_web" && result.results) collected.webResults.push(...result.results);
  if (name === "get_drive_analytics" && result) {
    collected.chartData = {
      type: "bar",
      title: "Files by Type",
      data: result.filesByType,
    };
  }
}

function deriveIntent(calledTools: Set<string>): QueryIntent {
  if (calledTools.has("get_drive_analytics")) return "ANALYTICS";
  if (calledTools.has("get_search_history") || calledTools.has("get_calendar_activity")) return "HISTORY";
  if (calledTools.has("search_web")) return "WEB_SEARCH";
  if (calledTools.has("search_folders")) return "DRIVE_FOLDER_SEARCH";
  if (calledTools.has("search_drive") || calledTools.has("get_file_metadata")) return "DRIVE_SEARCH";
  return "GENERAL";
}

function buildActions(files: DriveFile[]): AIAction[] {
  const actions: AIAction[] = [];
  for (const f of files.slice(0, 5)) {
    if (f.kind === "image") actions.push({ type: "preview_image", fileId: f.id, label: `Preview ${f.name}` });
    else if (f.kind === "video") actions.push({ type: "play_video", fileId: f.id, label: `Play ${f.name}` });
    else actions.push({ type: "open_file", fileId: f.id, label: `Open ${f.name}` });
  }
  return actions;
}

async function loadConversationMessages(
  userId: string,
  conversationId: string
): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
  const rows = await chatRepo.list(userId, conversationId);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const row of rows) {
    if (row.role === "user") {
      messages.push({ role: "user", content: row.content });
    } else if (row.role === "assistant") {
      // Replay a compact JSON summary of prior results so the model can resolve
      // references like "open the second one" without re-calling tools.
      const summary = row.payload
        ? `\n\n[Previous result context: ${JSON.stringify({
            files: (row.payload.files ?? []).map((f: DriveFile) => ({ id: f.id, name: f.name, kind: f.kind })),
            folders: (row.payload.folders ?? []).map((f: DriveFolder) => ({ id: f.id, name: f.name })),
          })}]`
        : "";
      messages.push({ role: "assistant", content: row.content + summary });
    }
  }
  return messages;
}

export async function runAssistant(userId: string, conversationId: string, userMessage: string): Promise<AIResponse> {
  const deterministic = routeDeterministic(userMessage);

  if (deterministic?.intent === "GENERAL" && userMessage.trim().toLowerCase().startsWith("/help")) {
    return emptyResponse(HELP_TEXT, "GENERAL");
  }

  const openai = client();
  const messages = await loadConversationMessages(userId, conversationId);

  let effectiveMessage = userMessage;
  if (deterministic) {
    const hint =
      deterministic.intent === "DRIVE_FOLDER_SEARCH"
        ? "List my Drive folders."
        : deterministic.intent === "IMAGE_PREVIEW"
        ? "Show my image files."
        : deterministic.intent === "VIDEO_PREVIEW"
        ? "Show my video files."
        : `List my Drive files${deterministic.cleanedQuery ? ` matching "${deterministic.cleanedQuery}"` : ""}.`;
    effectiveMessage = deterministic.cleanedQuery ? `${hint} (user typed: "${userMessage}")` : hint;
  }

  await chatRepo.add(userId, conversationId, "user", userMessage, null);
  messages.push({ role: "user", content: effectiveMessage });

  const collected: CollectedResults = { files: [], folders: [], webResults: [], chartData: null, calledTools: new Set() };

  let finalText = "";
  for (let iteration = 0; iteration < 4; iteration++) {
    const completion = await openai.chat.completions.create({
      model: env.openaiModel,
      messages,
      tools: toolDefinitions,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    const msg = choice.message;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      finalText = msg.content ?? "";
      break;
    }

    messages.push(msg);

    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      let args: any = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }
      let result: any;
      try {
        result = await executeTool(call.function.name, args, { userId });
        collectFromToolResult(collected, call.function.name, result);
      } catch (err: any) {
        result = { error: err.message ?? "TOOL_ERROR" };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result).slice(0, 8000) });
    }

    if (iteration === 3) {
      finalText = "I gathered the results but ran out of steps to summarize them. Here's what I found.";
    }
  }

  const images = collected.files.filter((f) => f.kind === "image");
  const videos = collected.files.filter((f) => f.kind === "video");
  const intent = deriveIntent(collected.calledTools) || deterministic?.intent || "GENERAL";

  const response: AIResponse = {
    answer: finalText || "I couldn't generate a response. Please try again.",
    intent,
    files: collected.files,
    folders: collected.folders,
    images,
    videos,
    citations: collected.webResults.map((r) => r.url),
    chartData: collected.chartData,
    actions: buildActions(collected.files),
    webResults: collected.webResults,
  };

  await chatRepo.add(userId, conversationId, "assistant", response.answer, {
    files: response.files,
    folders: response.folders,
  });

  await historyRepo.add(userId, {
    query: userMessage,
    queryType: intent,
    resultCount: response.files.length + response.folders.length + response.webResults.length,
    resultsSummary: [...response.files, ...response.folders].slice(0, 5).map((r: any) => r.name).join(", ") || null,
    openedFileId: null,
    openedFileName: null,
  });

  await activityRepo.add(userId, {
    action: "search",
    query: userMessage,
    fileId: null,
    fileName: null,
    folderId: null,
    folderName: null,
    metadata: { intent, resultCount: response.files.length + response.folders.length },
  });

  return response;
}

function emptyResponse(answer: string, intent: QueryIntent): AIResponse {
  return {
    answer,
    intent,
    files: [],
    folders: [],
    images: [],
    videos: [],
    citations: [],
    chartData: null,
    actions: [],
    webResults: [],
  };
}

export async function recordFileOpen(userId: string, fileId: string) {
  const file = await driveService.getFileMetadata(userId, fileId);
  await activityRepo.add(userId, {
    action: "open_file",
    query: null,
    fileId: file.id,
    fileName: file.name,
    folderId: null,
    folderName: null,
    metadata: { mimeType: file.mimeType },
  });
  return file;
}

export { buildAnalytics };

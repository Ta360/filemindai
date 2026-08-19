import OpenAI from "openai";
import { env, isOpenAIConfigured } from "../../config/env";
import { webSearchService } from "../webSearch/webSearchService";
import { agentActivityRepo } from "../../database/repositories";
import type { GoogleAgentAnswer } from "../../../../shared/types";

const SYSTEM_PROMPT = `You are the Google Agent inside "Google Drive LLM" — a quick-answer assistant. You are given live web search results for the user's query. Write a concise, direct answer (2-6 sentences or a short list) using ONLY the information in those results. Cite facts naturally in prose; do not invent URLs or facts not present in the results. If the results don't answer the question, say so plainly.`;

function client(): OpenAI {
  if (!isOpenAIConfigured) throw new Error("OPENAI_NOT_CONFIGURED");
  return new OpenAI({ apiKey: env.openaiApiKey });
}

export async function answerWithWebSearch(userId: string, query: string): Promise<GoogleAgentAnswer> {
  const started = Date.now();
  const sources = await webSearchService.search(query);

  const openai = client();
  const contextBlock = sources
    .slice(0, 8)
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}\nSource: ${s.source} (${s.url})`)
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: env.openaiModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Question: ${query}\n\nLive web search results:\n${contextBlock || "(no results found)"}` },
    ],
    temperature: 0.3,
  });

  const answer = completion.choices[0]?.message?.content?.trim() || "I couldn't find an answer for that.";

  agentActivityRepo.add(userId, { agent: "google", action: "search", topic: query.slice(0, 120), resultCount: sources.length });

  return { answer, sources, tookMs: Date.now() - started };
}

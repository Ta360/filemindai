import { env, isWebSearchConfigured } from "../../config/env";
import type { WebSearchResult } from "../../../../shared/types";

export interface WebSearchProvider {
  search(query: string): Promise<WebSearchResult[]>;
}

// ---------------------------------------------------------------------------
// Serper.dev (Google Search API wrapper) — https://serper.dev
// ---------------------------------------------------------------------------
class SerperProvider implements WebSearchProvider {
  async search(query: string): Promise<WebSearchResult[]> {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": env.searchApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 8 }),
    });
    if (!res.ok) throw new Error(`SERPER_HTTP_${res.status}`);
    const data = (await res.json()) as any;
    const organic = Array.isArray(data.organic) ? data.organic : [];
    return organic.map((r: any) => ({
      title: r.title ?? "Untitled",
      url: r.link,
      snippet: r.snippet ?? "",
      source: new URL(r.link).hostname.replace(/^www\./, ""),
      date: r.date ?? null,
      image: r.imageUrl ?? null,
    }));
  }
}

// ---------------------------------------------------------------------------
// Tavily — https://tavily.com (AI-oriented search API with content summaries)
// ---------------------------------------------------------------------------
class TavilyProvider implements WebSearchProvider {
  async search(query: string): Promise<WebSearchResult[]> {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.searchApiKey,
        query,
        max_results: 8,
        include_images: true,
      }),
    });
    if (!res.ok) throw new Error(`TAVILY_HTTP_${res.status}`);
    const data = (await res.json()) as any;
    const images: string[] = Array.isArray(data.images) ? data.images : [];
    return (data.results ?? []).map((r: any, i: number) => ({
      title: r.title ?? "Untitled",
      url: r.url,
      snippet: r.content ?? "",
      source: new URL(r.url).hostname.replace(/^www\./, ""),
      date: r.published_date ?? null,
      image: images[i] ?? null,
    }));
  }
}

class UnconfiguredProvider implements WebSearchProvider {
  async search(): Promise<WebSearchResult[]> {
    throw new Error("WEB_SEARCH_NOT_CONFIGURED");
  }
}

function selectProvider(): WebSearchProvider {
  if (!isWebSearchConfigured) return new UnconfiguredProvider();
  switch (env.webSearchProvider) {
    case "serper":
      return new SerperProvider();
    case "tavily":
      return new TavilyProvider();
    default:
      return new UnconfiguredProvider();
  }
}

export class WebSearchService {
  private provider = selectProvider();

  async search(query: string): Promise<WebSearchResult[]> {
    return this.provider.search(query);
  }
}

export const webSearchService = new WebSearchService();

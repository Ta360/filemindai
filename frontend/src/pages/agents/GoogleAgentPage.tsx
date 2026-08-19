import { useState } from "react";
import { Search, Loader2, ExternalLink } from "lucide-react";
import { agentsApi, ApiError } from "../../services/api";
import type { GoogleAgentAnswer } from "../../types";
import AgentChartPanel from "../../components/AgentChartPanel";
import AgentCalendarWidget from "../../components/AgentCalendarWidget";

interface Turn {
  id: string;
  query: string;
  answer?: GoogleAgentAnswer;
  error?: string;
  tookMs?: number;
}

export default function GoogleAgentPage() {
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    setQuery("");
    const id = Math.random().toString(36).slice(2);
    setTurns((prev) => [{ id, query: q }, ...prev]);
    setLoading(true);
    try {
      const answer = await agentsApi.googleChat(q);
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, answer } : t)));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, error: message } : t)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Google Agent</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ask about any topic — it searches the live web and answers right here, usually in a few seconds.
        </p>
      </div>

      <form onSubmit={ask} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything — e.g. 'latest news on AI regulation'"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </form>

      <div className="space-y-4">
        {turns.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400 dark:border-slate-700">
            Try a question to see an instant, web-sourced answer.
          </div>
        )}
        {turns.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.query}</p>
            {!t.answer && !t.error && (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching the web…
              </p>
            )}
            {t.error && <p className="mt-2 text-sm text-red-500">{t.error}</p>}
            {t.answer && (
              <>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{t.answer.answer}</p>
                <p className="mt-1 text-xs text-slate-400">Answered in {(t.answer.tookMs / 1000).toFixed(1)}s</p>
                {t.answer.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.answer.sources.slice(0, 6).map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {s.source} <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <AgentChartPanel agent="google" />

      <AgentCalendarWidget agent="google" />
    </div>
  );
}

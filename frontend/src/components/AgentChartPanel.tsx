import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { agentsApi } from "../services/api";
import type { AgentName } from "../types";

/**
 * Real Matplotlib-rendered bar + pie charts for one agent's daily search
 * activity. Images are generated server-side (Python + Matplotlib) from the
 * user's actual agent_activity rows — refresh to pull the latest data after
 * a new search.
 */
export default function AgentChartPanel({ agent }: { agent: AgentName }) {
  const [nonce, setNonce] = useState(0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <ChartCard title="Daily Searches — Bar" src={agentsApi.chartUrl(agent, "bar") + `&r=${nonce}`} onRefresh={() => setNonce((n) => n + 1)} />
      </div>
      <div className="lg:col-span-2">
        <ChartCard title="Daily Searches — Pie Share" src={agentsApi.chartUrl(agent, "pie") + `&r=${nonce}`} onRefresh={() => setNonce((n) => n + 1)} />
      </div>
    </div>
  );
}

function ChartCard({ title, src, onRefresh }: { title: string; src: string; onRefresh: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        <button onClick={onRefresh} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Refresh">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {failed ? (
        <div className="flex h-56 items-center justify-center text-center text-xs text-slate-400">
          Chart service unavailable. Start the Python microservice in <code>charts-service/</code> (see README).
        </div>
      ) : (
        <img key={src} src={src} alt={title} className="w-full rounded-lg" onError={() => setFailed(true)} />
      )}
    </div>
  );
}

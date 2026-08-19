import { ExternalLink, Globe } from "lucide-react";
import type { WebSearchResult } from "../../types";

export default function WebResultCard({ result }: { result: WebSearchResult }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
        <Globe className="h-3 w-3" />
        {result.source}
        {result.date && <span>· {result.date}</span>}
      </div>
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-1 text-sm font-medium text-brand-600 hover:underline"
      >
        {result.title}
        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
      </a>
      <p className="mt-1 line-clamp-3 text-xs text-slate-600 dark:text-slate-400">{result.snippet}</p>
    </div>
  );
}

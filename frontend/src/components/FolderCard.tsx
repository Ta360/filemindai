import { FolderOpen, ExternalLink, Copy } from "lucide-react";
import type { DriveFolder } from "../types";
import { formatDate } from "../utils/format";

export default function FolderCard({ folder }: { folder: DriveFolder }) {
  function copyLink() {
    if (folder.webViewLink) navigator.clipboard.writeText(folder.webViewLink);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <FolderOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white" title={folder.name}>
            {folder.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Folder · Modified {formatDate(folder.modifiedTime)}</p>
        </div>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">Parent: {folder.parentName ?? "My Drive"}</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {folder.webViewLink && (
          <a
            href={folder.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open Folder
          </a>
        )}
        <button
          onClick={copyLink}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Copy className="h-3.5 w-3.5" /> Copy Link
        </button>
      </div>
    </div>
  );
}

import { X, ExternalLink, Download, Copy, Eye } from "lucide-react";
import type { DriveFile } from "../types";
import { formatBytes, formatDateTime, fileKindLabel } from "../utils/format";
import { driveApi } from "../services/api";
import { useDashboard } from "../hooks/useDashboardStore";

export default function FileDetailsDrawer({ file, onClose }: { file: DriveFile | null; onClose: () => void }) {
  const { openFile, previewImage, playVideo } = useDashboard();
  if (!file) return null;

  const rows: [string, string][] = [
    ["File name", file.name],
    ["MIME type", file.mimeType],
    ["Size", formatBytes(file.size)],
    ["Created", formatDateTime(file.createdTime)],
    ["Modified", formatDateTime(file.modifiedTime)],
    ["Owner", file.owners.join(", ") || "—"],
    ["Folder", file.parentName ?? "My Drive"],
    ["File ID", file.id],
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{fileKindLabel(file.kind)} Details</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {file.thumbnailLink && <img src={file.thumbnailLink} alt="" className="mb-4 w-full rounded-lg object-cover" />}

        {file.description && <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{file.description}</p>}

        <dl className="space-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-slate-100 py-1.5 dark:border-slate-800">
              <dt className="text-slate-400">{label}</dt>
              <dd className="truncate text-right font-medium text-slate-700 dark:text-slate-200" title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => openFile(file)}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </button>
          {file.kind === "image" && (
            <button
              onClick={() => previewImage(file)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium dark:border-slate-700"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
          )}
          {file.kind === "video" && (
            <button
              onClick={() => playVideo(file)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium dark:border-slate-700"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
          )}
          <a
            href={driveApi.downloadUrl(file.id)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium dark:border-slate-700"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
          <button
            onClick={() => file.webViewLink && navigator.clipboard.writeText(file.webViewLink)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium dark:border-slate-700"
          >
            <Copy className="h-3.5 w-3.5" /> Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}

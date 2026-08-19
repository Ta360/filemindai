import { FileText, Image as ImageIcon, Video, FileSpreadsheet, Presentation, File as FileIcon, ExternalLink, Eye, Download, Copy, Info } from "lucide-react";
import type { DriveFile } from "../types";
import { formatBytes, formatDate, fileKindLabel } from "../utils/format";
import { driveApi } from "../services/api";
import { useDashboard } from "../hooks/useDashboardStore";

const ICONS: Record<string, any> = {
  document: FileText,
  pdf: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  image: ImageIcon,
  video: Video,
  audio: FileIcon,
  other: FileIcon,
};

export default function FileCard({ file, onDetails }: { file: DriveFile; onDetails?: (f: DriveFile) => void }) {
  const { openFile, previewImage, playVideo } = useDashboard();
  const Icon = ICONS[file.kind] ?? FileIcon;

  function copyLink() {
    if (file.webViewLink) navigator.clipboard.writeText(file.webViewLink);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        {file.thumbnailLink ? (
          <img src={file.thumbnailLink} alt="" className="h-10 w-10 rounded-lg object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {fileKindLabel(file.kind)} · {formatBytes(file.size)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span>Modified</span>
        <span className="text-right text-slate-700 dark:text-slate-300">{formatDate(file.modifiedTime)}</span>
        <span>Location</span>
        <span className="truncate text-right text-slate-700 dark:text-slate-300">{file.parentName ?? "My Drive"}</span>
      </div>

      <div className="mt-1 flex flex-wrap gap-1.5">
        <button
          onClick={() => openFile(file)}
          className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </button>
        {file.kind === "image" && (
          <button
            onClick={() => previewImage(file)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
        )}
        {file.kind === "video" && (
          <button
            onClick={() => playVideo(file)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
        )}
        <a
          href={driveApi.downloadUrl(file.id)}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
        <button
          onClick={copyLink}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Copy className="h-3.5 w-3.5" /> Copy Link
        </button>
        {onDetails && (
          <button
            onClick={() => onDetails(file)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Info className="h-3.5 w-3.5" /> Details
          </button>
        )}
      </div>
    </div>
  );
}

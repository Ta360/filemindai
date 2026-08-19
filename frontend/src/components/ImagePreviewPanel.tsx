import { useState } from "react";
import { ImageOff, ExternalLink, Download, Maximize2, Image as ImageIcon } from "lucide-react";
import type { DriveFile } from "../types";
import { driveApi } from "../services/api";
import { formatBytes, formatDate } from "../utils/format";

export default function ImagePreviewPanel({ file }: { file: DriveFile | null }) {
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!file) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-slate-400 dark:border-slate-700">
        <ImageIcon className="h-8 w-8" />
        <p className="text-sm">No image selected</p>
      </div>
    );
  }

  const src = driveApi.previewUrl(file.id);

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Image Preview</h3>
        {!failed && (
          <button onClick={() => setFullscreen(true)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fullscreen">
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-950">
        {failed ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-slate-400">
            <ImageOff className="h-8 w-8" />
            <p className="text-sm">This image cannot be previewed directly.</p>
            {file.webViewLink && (
              <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-600 hover:underline">
                Open in Google Drive
              </a>
            )}
          </div>
        ) : (
          <>
            {loading && <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-800" />}
            <img
              key={file.id}
              src={src}
              alt={file.name}
              className="max-h-[360px] w-full object-contain"
              onLoad={() => setLoading(false)}
              onError={() => {
                setFailed(true);
                setLoading(false);
              }}
            />
          </>
        )}
      </div>

      <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
        <p className="truncate font-medium text-slate-700 dark:text-slate-200">{file.name}</p>
        <p>
          {file.mimeType} · {formatBytes(file.size)} · Modified {formatDate(file.modifiedTime)}
        </p>
      </div>

      <div className="mt-3 flex gap-2">
        {file.webViewLink && (
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in Drive
          </a>
        )}
        <a
          href={driveApi.downloadUrl(file.id)}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
      </div>

      {fullscreen && !failed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6" onClick={() => setFullscreen(false)}>
          <img src={src} alt={file.name} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}

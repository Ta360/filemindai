import { useState } from "react";
import { VideoOff, ExternalLink, Video as VideoIcon } from "lucide-react";
import type { DriveFile } from "../types";
import { driveApi } from "../services/api";
import { formatBytes, formatDate } from "../utils/format";

const PLAYABLE_TYPES = ["video/mp4", "video/webm"];

export default function VideoPlayerPanel({ file }: { file: DriveFile | null }) {
  const [failed, setFailed] = useState(false);

  if (!file) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-slate-400 dark:border-slate-700">
        <VideoIcon className="h-8 w-8" />
        <p className="text-sm">No video selected</p>
      </div>
    );
  }

  const canAttemptPlayback = PLAYABLE_TYPES.includes(file.mimeType) || file.mimeType === "video/quicktime";
  const src = driveApi.previewUrl(file.id);

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Video Player</h3>

      <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-black">
        {!canAttemptPlayback || failed ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-slate-300">
            <VideoOff className="h-8 w-8" />
            <p className="text-sm">This video cannot be played directly in the browser.</p>
            {file.webViewLink && (
              <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-400 hover:underline">
                Open Video in Google Drive
              </a>
            )}
          </div>
        ) : (
          <video
            key={file.id}
            controls
            className="max-h-[360px] w-full"
            preload="metadata"
            onError={() => setFailed(true)}
          >
            <source src={src} type={file.mimeType} />
          </video>
        )}
      </div>

      <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
        <p className="truncate font-medium text-slate-700 dark:text-slate-200">{file.name}</p>
        <p>
          {file.mimeType} · {formatBytes(file.size)} · Modified {formatDate(file.modifiedTime)}
        </p>
      </div>

      {file.webViewLink && (
        <a
          href={file.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-fit items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open in Drive
        </a>
      )}
    </div>
  );
}

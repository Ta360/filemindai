import { X } from "lucide-react";
import type { InstagramMediaItem } from "../types";

/** In-app preview for a clicked Instagram media item — never navigates to instagram.com. */
export default function ImagePreviewModal({ item, onClose }: { item: InstagramMediaItem | null; onClose: () => void }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close preview"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="max-h-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {item.mediaType === "VIDEO" ? (
          <video src={item.mediaUrl} controls autoPlay className="max-h-[80vh] w-full rounded-lg" />
        ) : (
          <img src={item.mediaUrl} alt={item.caption ?? "Instagram media"} className="max-h-[80vh] w-full rounded-lg object-contain" />
        )}
        {item.caption && <p className="mt-3 max-h-24 overflow-y-auto text-sm text-slate-200">{item.caption}</p>}
      </div>
    </div>
  );
}

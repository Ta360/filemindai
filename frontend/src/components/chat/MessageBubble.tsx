import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, User, Copy, RotateCcw, AlertTriangle, Check } from "lucide-react";
import clsx from "clsx";
import type { ChatMessage } from "../../types";
import FileCard from "../FileCard";
import FolderCard from "../FolderCard";
import WebResultCard from "./WebResultCard";

export default function MessageBubble({ message, onRetry }: { message: ChatMessage; onRetry?: () => void }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  function copy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={clsx("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={clsx("max-w-[85%] space-y-2", isUser && "items-end text-right")}>
        <div
          className={clsx(
            "rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "bg-brand-600 text-white"
              : "bg-white text-slate-800 shadow-card dark:bg-slate-900 dark:text-slate-100"
          )}
        >
          {message.isLoading ? (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current" style={{ animationDelay: "300ms" }} />
              <span className="ml-1 text-xs text-slate-400">AI Assistant is thinking…</span>
            </span>
          ) : message.error ? (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{message.error}</span>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!message.isLoading && !isUser && (message.content || message.error) && (
          <div className="flex gap-2 text-xs text-slate-400">
            <button onClick={copy} className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
            </button>
            {onRetry && (
              <button onClick={onRetry} className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200">
                <RotateCcw className="h-3 w-3" /> {message.error ? "Retry" : "Regenerate"}
              </button>
            )}
          </div>
        )}

        {!!message.folders?.length && (
          <div className="grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
            {message.folders.map((f) => (
              <FolderCard key={f.id} folder={f} />
            ))}
          </div>
        )}

        {!!message.files?.length && (
          <div className="grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
            {message.files.map((f) => (
              <FileCard key={f.id} file={f} />
            ))}
          </div>
        )}

        {!!message.webResults?.length && (
          <div className="space-y-2 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Web Search Results</p>
            {message.webResults.map((r, i) => (
              <WebResultCard key={i} result={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

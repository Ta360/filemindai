import { useEffect, useRef, useState } from "react";
import { Trash2, SendHorizontal, Sparkles } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboardStore";
import MessageBubble from "./MessageBubble";

const SUGGESTIONS = ["Find my resume", "/folders", "Show me files by type", "What's the latest AI news?"];

export default function ChatWindow() {
  const { messages, sendMessage, isSending, clearConversation, retryLast, connection } = useDashboard();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    sendMessage(input);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50/50 shadow-card dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">AI Assistant</h2>
        </div>
        <button
          onClick={clearConversation}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="h-8 w-8 text-brand-300" />
            <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Ask about your Google Drive, search the web, or try a quick command like <code>/folders</code>.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onRetry={m.role === "assistant" ? retryLast : undefined} />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3 dark:border-slate-800">
        {!connection.connected && (
          <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
            Connect Google Drive to search your files — you can still ask general questions.
          </p>
        )}
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Try "Find my resume" or "/folders"'
            className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-brand-900"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

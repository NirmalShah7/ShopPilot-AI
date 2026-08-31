import { useState } from "react";
import { Plus, Search, GitCompare, ArrowUp, ShieldCheck } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { IconButton } from "@/components/ui/IconButton";
import { Pill } from "@/components/ui/Pill";

export function ChatInputBar() {
  const draft = useChatStore((s) => s.draft);
  const setDraft = useChatStore((s) => s.setDraft);
  const submitMessage = useChatStore((s) => s.submitMessage);
  const isSending = useChatStore((s) => s.isSending);
  const [mode, setMode] = useState<"search" | "compare" | null>(null);

  const handleSend = () => {
    if (isSending) return;
    submitMessage(draft);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="w-full">
      <div className="bg-white border border-app-border rounded-2xl px-4 pt-4 pb-3">
        <input
          aria-label="Chat message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about products, orders, deals..."
          className="w-full bg-transparent outline-none text-app-text placeholder-app-text-muted text-sm mb-4"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconButton aria-label="Add attachment">
              <Plus className="w-4 h-4 text-app-text-soft" aria-hidden="true" />
            </IconButton>
            <Pill
              icon={<Search className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => setMode(mode === "search" ? null : "search")}
              className={mode === "search" ? "bg-app-accent-soft" : ""}
            >
              Search
            </Pill>
            <Pill
              icon={<GitCompare className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => setMode(mode === "compare" ? null : "compare")}
              className={mode === "compare" ? "bg-app-accent-soft" : ""}
            >
              Compare
            </Pill>
          </div>
          <button
            onClick={handleSend}
            disabled={isSending}
            aria-label="Send message"
            className="w-9 h-9 rounded-full bg-app-accent hover:bg-app-accent-hover disabled:opacity-50 flex items-center justify-center transition-colors"
          >
            <ArrowUp className="w-4 h-4 text-white" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-app-text-muted">
        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
        Your data is private and secure
      </div>
    </div>
  );
}

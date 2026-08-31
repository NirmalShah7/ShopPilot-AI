import { MessageSquare } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { useNavigate } from "react-router-dom";

function groupByDay(updatedAt: number): string {
  const now = new Date();
  const date = new Date(updatedAt);
  const isSameDay = (a: Date, b: Date) =>
    a.toDateString() === b.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return "Older";
}

export function ChatHistoryList() {
  const threads = useChatStore((s) => s.threads);
  const activeThreadId = useChatStore((s) => s.activeThreadId);
  const setActiveThread = useChatStore((s) => s.setActiveThread);
  const navigate = useNavigate();

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-app-text-muted">
        <MessageSquare className="w-6 h-6 mb-2 opacity-60" aria-hidden="true" />
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs mt-1">Start a new chat to see it here</p>
      </div>
    );
  }

  const groups = threads.reduce<Record<string, typeof threads>>((acc, t) => {
    const key = groupByDay(t.updatedAt);
    acc[key] = acc[key] ? [...acc[key], t] : [t];
    return acc;
  }, {});

  const order = ["Today", "Yesterday", "Older"];

  return (
    <div className="space-y-5">
      {order
        .filter((key) => groups[key]?.length)
        .map((key) => (
          <div key={key}>
            <p className="text-xs font-medium text-app-text-muted px-2 mb-1.5">
              {key}
            </p>
            <div className="space-y-0.5">
              {groups[key].map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => { setActiveThread(thread.id); navigate("/"); }}
                  className={`w-full flex items-start gap-2 px-2 py-2 rounded-lg text-left text-sm transition-colors ${
                    thread.id === activeThreadId
                      ? "bg-app-accent-soft text-app-text font-medium"
                      : "text-app-text-soft hover:bg-app-bg"
                  }`}
                >
                  <MessageSquare
                    className="w-4 h-4 mt-0.5 shrink-0 opacity-70"
                    aria-hidden="true"
                  />
                  <span className="line-clamp-2">{thread.title}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

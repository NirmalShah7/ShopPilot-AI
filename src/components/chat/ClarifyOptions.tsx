import type { ClarifyOption } from "@/types/chat";
import { useChatStore } from "@/store/chatStore";

interface ClarifyOptionsProps {
  options: ClarifyOption[];
}

export function ClarifyOptions({ options }: ClarifyOptionsProps) {
  const submitMessage = useChatStore((s) => s.submitMessage);

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => submitMessage(opt.label)}
          className="px-3 py-1.5 rounded-full border border-app-border text-sm text-app-text-soft hover:bg-app-accent-soft hover:border-app-border-strong transition-colors"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

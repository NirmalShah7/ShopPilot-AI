import { SUGGESTIONS } from "@/lib/constants";
import { SuggestionCard } from "@/components/chat/SuggestionCard";
import { useChatStore } from "@/store/chatStore";

export function SuggestionGrid() {
  const submitMessage = useChatStore((s) => s.submitMessage);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 w-full">
      {SUGGESTIONS.map((item, i) => (
        <SuggestionCard
          key={item.id}
          item={item}
          index={i}
          onSelect={submitMessage}
        />
      ))}
    </div>
  );
}

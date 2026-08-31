import { HeroHeader } from "@/components/chat/HeroHeader";
import { SuggestionGrid } from "@/components/chat/SuggestionGrid";
import { ChatInputBar } from "@/components/chat/ChatInputBar";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { CartDrawer } from "@/components/product/CartDrawer";
import { useState } from "react";
import { useChatStore } from "@/store/chatStore";

export default function AgentHome() {
  const threads = useChatStore((s) => s.threads);
  const activeThreadId = useChatStore((s) => s.activeThreadId);
  const activeThread = threads.find((t) => t.id === activeThreadId);
  const hasMessages = !!activeThread && activeThread.messages.length > 0;
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="relative flex h-full min-h-0 flex-col items-center bg-[#f8f7f2] px-4 sm:px-6 lg:px-8">
      <div className="absolute right-4 top-4 z-30 sm:right-7">
        <button onClick={() => setCartOpen(true)} className="flex h-10 items-center gap-2 rounded-full border border-[#e2dfd6] bg-white px-3.5 text-[11px] font-semibold text-[#34332e] shadow-[0_6px_20px_rgba(30,30,20,0.08)]">
          <ShoppingCart className="h-4 w-4" /> Cart {cartCount > 0 && <span className="rounded-full bg-[#687000] px-1.5 py-0.5 text-[9px] text-white">{cartCount}</span>}
        </button>
      </div>

      {hasMessages ? (
        <div className="w-full max-w-[1100px] flex-1 min-h-0 overflow-y-auto pb-32 pt-12">
          <ChatMessageList messages={activeThread!.messages} />
        </div>
      ) : (
        <div className="w-full max-w-[1100px] flex-1 flex flex-col items-center justify-center pb-24">
          <HeroHeader />
          <SuggestionGrid />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center bg-gradient-to-t from-[#f8f7f2] via-[#f8f7f2]/95 to-transparent px-4 pb-3 pt-7 sm:px-6">
        <div className="w-full max-w-[900px]"><ChatInputBar /></div>
      </div>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

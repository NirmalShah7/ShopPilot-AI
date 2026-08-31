import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatThread, ChatMessage } from "@/types/chat";
import { loadMoreChatProducts, sendChatMessage } from "@/lib/api";

interface ChatState {
  threads: ChatThread[];
  activeThreadId: string | null;
  draft: string;
  isSending: boolean;
  setDraft: (value: string) => void;
  createThread: () => string;
  setActiveThread: (id: string | null) => void;
  submitMessage: (content: string) => Promise<void>;
  retryMessage: (threadId: string, messageId: string) => Promise<void>;
  loadMoreProducts: (threadId: string, messageId: string) => Promise<void>;
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const touchThread = (threads: ChatThread[], id: string, updater: (t: ChatThread) => ChatThread) => threads.map((t) => t.id === id ? updater(t) : t);

async function performSend(set: any, get: any, threadId: string, content: string, loadingMessageId: string) {
  try {
    const response = await sendChatMessage(threadId, content);
    const replyId = makeId();
    set((state: ChatState) => ({
      threads: touchThread(state.threads, threadId, (t) => ({ ...t, messages: t.messages.map((m) => m.id === loadingMessageId ? {
        id: replyId, role: "assistant" as const, content: response.message, createdAt: Date.now(),
        products: response.type === "products" ? response.items : undefined,
        productOffset: response.type === "products" ? response.offset : undefined,
        productLimit: response.type === "products" ? response.limit : undefined,
        productTotal: response.type === "products" ? response.total : undefined,
        productHasMore: response.type === "products" ? response.hasMore : undefined,
        productFilters: response.type === "products" ? response.filters : undefined,
        clarifyOptions: response.type === "clarify" ? response.options : undefined,
        clarifyField: response.type === "clarify" ? response.field : undefined,
      } : m), updatedAt: Date.now() })), isSending: false
    }));
  } catch (err) {
    set((state: ChatState) => ({ threads: touchThread(state.threads, threadId, (t) => ({ ...t, messages: t.messages.map((m) => m.id === loadingMessageId ? { ...m, isLoading: false, content: `I couldn't complete that request. ${err instanceof Error ? err.message : "Please try again."}` } : m) })), isSending: false }));
  }
}

export const useChatStore = create<ChatState>()(persist((set, get) => ({
  threads: [], activeThreadId: null, draft: "", isSending: false,
  setDraft: (value) => set({ draft: value }),
  createThread: () => {
    const id = makeId(), now = Date.now();
    set((state) => ({ threads: [{ id, title: "New chat", messages: [], createdAt: now, updatedAt: now }, ...state.threads], activeThreadId: id, draft: "" }));
    return id;
  },
  setActiveThread: (id) => set({ activeThreadId: id }),
  submitMessage: async (content) => {
    const trimmed = content.trim(); if (!trimmed || get().isSending) return;
    let threadId = get().activeThreadId; if (!threadId) threadId = get().createThread();
    const now = Date.now(); const userMessage: ChatMessage = { id: makeId(), role: "user", content: trimmed, createdAt: now };
    const loadingMessage: ChatMessage = { id: makeId(), role: "assistant", content: "", createdAt: now, isLoading: true };
    set((state) => ({ threads: touchThread(state.threads, threadId!, (t) => ({ ...t, title: t.messages.length === 0 ? trimmed.slice(0, 48) : t.title, messages: [...t.messages, userMessage, loadingMessage], updatedAt: now })), draft: "", isSending: true }));
    await performSend(set, get, threadId!, trimmed, loadingMessage.id);
  },
  retryMessage: async (threadId, messageId) => {
    if (get().isSending) return;
    const thread = get().threads.find((t) => t.id === threadId);
    const index = thread?.messages.findIndex((m) => m.id === messageId) ?? -1;
    if (!thread || index < 1) return;
    const previous = thread.messages[index - 1]; if (previous.role !== "user") return;
    const loadingId = makeId();
    set((state) => ({ threads: touchThread(state.threads, threadId, (t) => ({ ...t, messages: t.messages.map((m) => m.id === messageId ? { ...m, id: loadingId, content: "", isLoading: true } : m) })), isSending: true }));
    await performSend(set, get, threadId, previous.content, loadingId);
  },
  loadMoreProducts: async (threadId, messageId) => {
    const thread = get().threads.find((t) => t.id === threadId); const message = thread?.messages.find((m) => m.id === messageId);
    if (!message?.products || !message.productFilters || !message.productHasMore) return;
    const offset = message.productOffset ?? message.products.length; const limit = message.productLimit ?? 6;
    try {
      const response = await loadMoreChatProducts(message.productFilters, offset, limit);
      set((state) => ({ threads: touchThread(state.threads, threadId, (t) => ({ ...t, messages: t.messages.map((m) => m.id === messageId ? { ...m, products: [...(m.products ?? []), ...response.items], productOffset: response.offset + response.items.length, productLimit: response.limit, productTotal: response.total, productHasMore: response.hasMore } : m), updatedAt: Date.now() })) }));
    } catch (err) { console.error("load more products error:", err); }
  },
}), { name: "shopping-agent-chat" }));

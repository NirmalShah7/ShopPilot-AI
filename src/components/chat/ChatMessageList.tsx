import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clipboard, Check, Loader2, RotateCcw, Sparkles } from "lucide-react";
import type { ChatMessage } from "@/types/chat";
import { ProductCard } from "@/components/chat/ProductCard";
import { ClarifyOptions } from "@/components/chat/ClarifyOptions";
import { ProductDetailModal } from "@/components/product/ProductDetailModal";
import { useChatStore } from "@/store/chatStore";

interface ChatMessageListProps {
  messages: ChatMessage[];
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-1" aria-label="Agent is thinking">
      <span className="w-1.5 h-1.5 rounded-full bg-app-text-muted animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-app-text-muted animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-app-text-muted animate-bounce" />
    </div>
  );
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

function AssistantContent({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const output: JSX.Element[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // Render markdown tables as real tables instead of showing raw | markup.
    if (line.trim().startsWith("|") && lines[i + 1]?.includes("---")) {
      const header = line.split("|").slice(1, -1).map((x) => x.trim());
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].split("|").slice(1, -1).map((x) => x.trim()));
        i += 1;
      }
      i -= 1;
      output.push(
        <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-xl border border-app-border bg-white">
          <table className="w-full min-w-[520px] border-collapse text-xs">
            <thead className="bg-[#f7f6f1]">
              <tr>{header.map((cell, index) => <th key={index} className="border-b border-app-border px-3 py-2 text-left font-semibold">{<InlineText text={cell} />}</th>)}</tr>
            </thead>
            <tbody>{rows.map((row, r) => <tr key={r}>{header.map((_, c) => <td key={c} className="border-b border-app-border px-3 py-2 align-top text-app-text">{<InlineText text={row[c] ?? "Not listed"} />}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    const heading = line.match(/^###\s+(.+)$/);
    if (heading) {
      output.push(<h3 key={i} className="mt-3 mb-1 text-sm font-bold text-app-text"><InlineText text={heading[1]} /></h3>);
      continue;
    }

    const bullet = line.match(/^\s*(?:[-•])\s+(.+)$/);
    if (bullet) {
      output.push(<div key={i} className="flex gap-2 text-sm leading-6"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-app-accent" /><span><InlineText text={bullet[1]} /></span></div>);
      continue;
    }

    if (!line.trim()) {
      output.push(<div key={i} className="h-2" />);
      continue;
    }

    output.push(<p key={i} className="text-sm leading-6 text-app-text"><InlineText text={line} /></p>);
  }

  return <div>{output}</div>;
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const [selectedProduct, setSelectedProduct] = useState<NonNullable<ChatMessage["products"]>[number] | null>(null);
  const [loadingMoreId, setLoadingMoreId] = useState<string | null>(null);
  const loadMoreProducts = useChatStore((state) => state.loadMoreProducts);
  const retryMessage = useChatStore((state) => state.retryMessage);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const activeThreadId = useChatStore((state) => state.activeThreadId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.isLoading]);

  return (
    <div className="w-full max-w-[900px] flex flex-col gap-5 py-6">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          {msg.role === "user" ? (
            <div className="group max-w-[75%] flex flex-col items-end">
              <div className="bg-app-accent text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5">{msg.content}</div>
              <button
                type="button"
                onClick={async () => { await navigator.clipboard.writeText(msg.content); setCopiedId(msg.id); window.setTimeout(() => setCopiedId(null), 1200); }}
                className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-[#858278] opacity-0 transition group-hover:opacity-100 hover:bg-white hover:text-[#55534c]"
                aria-label="Copy prompt"
              >{copiedId === msg.id ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}{copiedId === msg.id ? "Copied" : "Copy"}</button>
            </div>
          ) : (
            <div className="max-w-full w-full flex gap-3">
              <div className="w-7 h-7 rounded-full bg-white border border-app-border flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-app-accent" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                {msg.isLoading ? (
                  <TypingDots />
                ) : (
                  <>
                    {msg.content && (
                      <div className="mb-2"><AssistantContent content={msg.content} /></div>
                    )}
                    {!msg.isLoading && msg.content.includes("I couldn't complete that request") && activeThreadId && (
                      <button type="button" onClick={() => retryMessage(activeThreadId, msg.id)} className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-[#e2dfd6] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5e5c54] hover:bg-[#f7f6f1]"><RotateCcw className="h-3 w-3" /> Retry</button>
                    )}

                    {msg.clarifyOptions && msg.clarifyOptions.length > 0 && (
                      <ClarifyOptions options={msg.clarifyOptions} />
                    )}

                    {msg.products && msg.products.length > 0 && (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                          {msg.products.map((product) => (
                            <ProductCard key={`${msg.id}-${product.id}`} product={product} onOpen={setSelectedProduct} />
                          ))}
                        </div>

                        {msg.productHasMore && activeThreadId && (
                          <div className="flex justify-center pt-4">
                            <button
                              type="button"
                              disabled={loadingMoreId === msg.id}
                              onClick={async () => {
                                setLoadingMoreId(msg.id);
                                await loadMoreProducts(activeThreadId, msg.id);
                                setLoadingMoreId(null);
                              }}
                              className="inline-flex h-9 items-center gap-2 rounded-full border border-[#ddd9ca] bg-white px-4 text-xs font-semibold text-[#5f6200] shadow-sm transition hover:border-[#687000] hover:bg-[#f8f7ef] disabled:cursor-wait disabled:opacity-60"
                            >
                              {loadingMoreId === msg.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                              {loadingMoreId === msg.id ? "Loading more..." : "Show more products"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
      <ProductDetailModal product={selectedProduct} sidePanel onClose={() => setSelectedProduct(null)} />
    </div>
  );
}

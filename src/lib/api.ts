import type { Product, ClarifyOption } from "@/types/chat";
export const API_BASE = "https://shoppilot-ai-ikfp.onrender.com";
export type ChatApiResponse =
  | { type: "clarify"; message: string; field: "budget" | "category" | "brand"; options: ClarifyOption[] }
  | { type: "products"; message: string; items: Product[]; offset: number; limit: number; total: number; hasMore: boolean; resultMode?: "single" | "multiple"; filters: { category: string | null; budgetMin: number | null; budgetMax: number | null; brand: string | null; keywords: string[]; } }
  | { type: "text"; message: string };
async function jsonOrThrow(res: Response, fallback: string) { const body = await res.json().catch(() => null); if (!res.ok) throw new Error(body?.error || fallback); return body; }
export async function sendChatMessage(threadId: string, message: string): Promise<ChatApiResponse> { const res = await fetch(`${API_BASE}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId, message }) }); return jsonOrThrow(res, `Chat request failed: ${res.status}`); }
export async function loadMoreChatProducts(filters: { category: string | null; budgetMin: number | null; budgetMax: number | null; brand: string | null; keywords: string[] }, offset: number, limit = 6): Promise<Extract<ChatApiResponse, { type: "products" }>> { const res = await fetch(`${API_BASE}/api/chat/more`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filters, offset, limit }) }); return jsonOrThrow(res, `Load more request failed: ${res.status}`); }


export async function getCartRecommendations(productIds: string[], limit = 6): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/api/products/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds, limit }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Recommendations request failed: ${res.status}`);
  return Array.isArray(body?.items) ? body.items : [];
}

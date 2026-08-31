import type { Product } from "./product.js";

export interface ChatRequestBody {
  threadId: string;
  contextProductId?: string;
  message: string;
}

export interface ClarifyOption {
  label: string;
  value: string;
}

export interface ClarifyResponse {
  type: "clarify";
  message: string;
  field: "budget" | "category" | "brand";
  options: ClarifyOption[];
}

export interface ProductsResponse {
  type: "products";
  message: string;
  items: Product[];
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
  filters: IntentFilters;
}

export interface TextResponse {
  type: "text";
  message: string;
}

export type ChatResponse = ClarifyResponse | ProductsResponse | TextResponse;

export interface IntentFilters {
  category: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  brand: string | null;
  keywords: string[];
}

export interface ExtractedIntent {
  filters: IntentFilters;
  needsClarification: boolean;
  clarificationField: "budget" | "category" | "brand" | null;
  clarificationQuestion: string | null;
  assistantMessage: string;
  resultMode: "single" | "multiple";
}

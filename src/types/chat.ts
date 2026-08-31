export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  mrp: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  description: string;
  specs: Record<string, string>;
  tags: string[];
}

export interface ClarifyOption {
  label: string;
  value: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  products?: Product[];
  productOffset?: number;
  productLimit?: number;
  productTotal?: number;
  productHasMore?: boolean;
  productFilters?: {
    category: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
    brand: string | null;
    keywords: string[];
  };
  clarifyOptions?: ClarifyOption[];
  clarifyField?: "budget" | "category" | "brand";
  isLoading?: boolean;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface SuggestionItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  prompt: string;
}

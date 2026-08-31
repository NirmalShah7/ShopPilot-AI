import { Store, Package, Sparkles } from "lucide-react";
import type { NavItem } from "@/types/nav";
import type { SuggestionItem } from "@/types/chat";

/**
 * Customer-facing navigation only.
 * Merchant and Audit are intentionally not exposed in the frontend sidebar.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    id: "browse",
    label: "Browse",
    path: "/browse",
    icon: Store,
  },
  {
    id: "orders",
    label: "Orders",
    path: "/orders",
    icon: Package,
  },
  {
    id: "agent",
    label: "Agent",
    path: "/",
    icon: Sparkles,
    badge: "AI",
  },
];

/**
 * Electronics-only starter prompts shown on the Agent home screen.
 */
export const SUGGESTIONS: SuggestionItem[] = [
  {
    id: "best-laptop",
    icon: "Laptop",
    title: "Best laptop for",
    subtitle: "college students",
    prompt: "Find me the best laptop for college students",
  },
  {
    id: "smartphone-under-30000",
    icon: "Smartphone",
    title: "Best smartphone",
    subtitle: "under ₹30,000",
    prompt: "Show me the best smartphones under ₹30,000",
  },
  {
    id: "noise-cancelling",
    icon: "Headphones",
    title: "Noise cancelling",
    subtitle: "headphones",
    prompt: "Find me the best noise cancelling headphones",
  },
  {
    id: "best-smartwatch",
    icon: "Watch",
    title: "Best smartwatch",
    subtitle: "for everyday use",
    prompt: "Find me the best smartwatch for everyday use",
  },
  {
    id: "best-camera",
    icon: "Camera",
    title: "Best camera",
    subtitle: "for photography",
    prompt: "Find me the best cameras for photography",
  },
  {
    id: "storage",
    icon: "HardDrive",
    title: "Best storage",
    subtitle: "for my device",
    prompt: "Find me the best SSD and storage options for my device",
  },
];

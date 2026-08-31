import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import type { SuggestionItem } from "@/types/chat";

interface SuggestionCardProps {
  item: SuggestionItem;
  onSelect: (prompt: string) => void;
  index: number;
}

export function SuggestionCard({ item, onSelect, index }: SuggestionCardProps) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[
    item.icon
  ];

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      onClick={() => onSelect(item.prompt)}
      className="flex flex-col items-center text-center gap-3 bg-white border border-app-border rounded-2xl px-4 py-6 hover:border-app-border-strong hover:shadow-sm transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-app-bg flex items-center justify-center">
        {Icon && <Icon className="w-5 h-5 text-app-text" aria-hidden="true" />}
      </div>
      <div className="text-sm text-app-text leading-snug">
        <div className="font-medium">{item.title}</div>
        <div>{item.subtitle}</div>
      </div>
    </motion.button>
  );
}

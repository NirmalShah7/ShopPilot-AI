import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function HeroHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-white border border-app-border flex items-center justify-center mb-6 relative">
        <Sparkles className="w-7 h-7 text-app-accent" aria-hidden="true" />
      </div>

      <h1 className="text-3xl md:text-4xl font-semibold text-app-text">
        Hi, I&rsquo;m your{" "}
        <span className="text-app-accent">shopping agent</span>
      </h1>
      <p className="text-app-text-muted mt-3 max-w-md">
        I can help you discover products, compare options, track orders, and
        more.
      </p>
    </motion.div>
  );
}

import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "#f4f2ea",
          sidebar: "#faf9f5",
          border: "#e8e5da",
          "border-strong": "#c9c5b3",
          text: "#2c2b26",
          "text-soft": "#5c5a4e",
          "text-muted": "#9a978c",
          accent: "#5c6318",
          "accent-hover": "#4d5314",
          "accent-soft": "#eceadd",
        },
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
} satisfies Config;

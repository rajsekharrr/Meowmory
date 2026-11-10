import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:          "#F7F7F5",
        "bg-subtle": "#EFEDE9",
        surface:     "#FFFFFF",
        border:      "#E4E2DD",
        text:        "#1A1A18",
        "text-muted":"#8A8880",
        accent:      "#2D6A4F",
        "accent-warm":"#C4622D",
        removed:     "#9B1D1D",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

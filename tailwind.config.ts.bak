import type { Config } from "tailwindcss";

const tailwindConfig: Config = {
  // The legacy index.html toggled dark mode via `document.documentElement.classList.toggle('dark')`;
  // we preserve exactly that behaviour so pre-existing dark: utilities keep working.
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // The single accent colour the original UI used across buttons, stats, and
        // financial highlights. Kept as a named token so it's easy to rebrand later.
        brand: {
          teal: "#4FD1C5",
        },
      },
      fontFamily: {
        // The original CDN Tailwind build inherited the system stack; we lock it in
        // explicitly so headings/body render identically after the migration.
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 180ms ease-out",
      },
    },
  },
  plugins: [],
};

export default tailwindConfig;

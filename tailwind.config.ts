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
        // Jayaphone Visual Design System v2 — light is the canonical surface.
        // Dark tokens stay available for the existing ThemeContext compatibility.
        jp: {
          app: "#FFFFFF",
          "app-dark": "#0B0B0D",
          surface: "#FFFFFF",
          "surface-dark": "#141416",
          "surface-subtle": "#FAFAF8",
          "surface-subtle-dark": "#1B1B1E",
          text: "#0A0A0A",
          "text-dark": "#F4F4F5",
          "text-soft": "#303330",
          muted: "#6E736F",
          "muted-dark": "#A1A1AA",
          faint: "#A5AAA6",
          border: "#E7EAE7",
          "border-strong": "#D4D8D5",
          "border-dark": "#2A2A2E",
          teal: "rgb(var(--jp-teal) / <alpha-value>)",
          "teal-dark": "#5FC9BE",
          "teal-hover": "#095C57",
          "teal-soft": "#E8F2F0",
          "teal-muted": "#C8E0DC",
          "teal-soft-dark": "#123B38",
          success: "#0B6F68",
          "success-dark": "#5FC9BE",
          warning: "#7A5A18",
          "warning-soft": "#F7F1E4",
          "warning-dark": "#D8B96A",
          info: "#303330",
          "info-soft": "#F1F3F1",
          "info-dark": "#D6D9D6",
          danger: "#9B3733",
          "danger-soft": "#F8E9E7",
          "danger-dark": "#E58A84",
        },
        // Backward-compatible alias used by existing components.
        brand: {
          teal: "rgb(var(--jp-teal) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        // Preserve the existing font-mono call sites while keeping one visual
        // family throughout the product. Tabular numerals handle alignment.
        mono: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "jp-xs": "6px",
        "jp-sm": "10px",
        "jp-md": "14px",
        "jp-lg": "18px",
      },
      boxShadow: {
        "jp-overlay": "0 8px 24px rgba(10, 10, 10, 0.08)",
        "jp-modal": "0 20px 60px rgba(10, 10, 10, 0.14)",
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

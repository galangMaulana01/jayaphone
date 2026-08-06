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
        // Jayaphone Design System — use these semantic tokens instead of arbitrary colours.
        jp: {
          app: "#F7F7F3",
          "app-dark": "#0B0B0D",
          surface: "#FFFFFF",
          "surface-dark": "#141416",
          "surface-subtle": "#F1F1EC",
          "surface-subtle-dark": "#1B1B1E",
          text: "#161618",
          "text-dark": "#F4F4F5",
          muted: "#6F706F",
          "muted-dark": "#A1A1AA",
          border: "#E8E8E2",
          "border-dark": "#2A2A2E",
          // v2 §4 — gradient end-stop for hero card; pekat (deeper than surface-dark).
          "abyss": "#050506",
          teal: "#4FD1C5",
          "teal-soft": "#DDF7F3",
          "teal-soft-dark": "#123B38",
          yellow: "#F6D74B",
          success: "#2FAE74",
          "success-dark": "#34D399",
          warning: "#D99A22",
          "warning-dark": "#FBBF24",
          info: "#4886DA",
          "info-dark": "#60A5FA",
          danger: "#E85C5C",
          "danger-dark": "#FB7185",
        },
        // Backward-compatible alias used by existing components.
        brand: {
          teal: "#4FD1C5",
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
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
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
      // DESIGN.md v2 §3.1 — the ONLY two gradients allowed in the app.
      // Hero card: subtle diagonal from surface-dark to near-black, with a
      //   soft top-left highlight, evocative of Payflow/Citadel — dark-first.
      // Primary button: monochrome bar. Dark mode → light-to-white with dark
      //   text; light mode → dark-to-black with white text (handled per-mode
      //   via CSS custom properties in globals.css).
      backgroundImage: {
        "gradient-hero":
          "radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 55%), linear-gradient(135deg, #141416 0%, #050506 100%)",
        "gradient-hero-light":
          "radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 55%), linear-gradient(135deg, #FFFFFF 0%, #E8E8E2 100%)",
        "gradient-primary":
          "linear-gradient(135deg, #F4F4F5 0%, #FFFFFF 100%)",
        "gradient-primary-light":
          "linear-gradient(135deg, #1D1D1F 0%, #050506 100%)",
      },
    },
  },
  plugins: [],
};

export default tailwindConfig;

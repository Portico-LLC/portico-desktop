/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Portico primary palette. Values are CSS custom properties (defined in
        // src/index.css) rather than literal hex so every one of these utility
        // classes automatically re-themes under [data-theme="dark"] — see the
        // "Dark mode" section of index.css for the light/dark definitions of
        // each step below.
        pine: {
          50: "var(--pine-50)",
          100: "var(--pine-100)",
          200: "var(--pine-200)",
          300: "var(--pine-300)",
          400: "var(--pine-400)",
          500: "var(--pine-500)",
          600: "var(--pine-600)",
          700: "var(--pine-700)",
          800: "var(--pine-800)",
          900: "var(--pine-900)",
          950: "var(--pine-950)",
        },
        brass: {
          50: "var(--brass-50)",
          100: "var(--brass-100)",
          200: "var(--brass-200)",
          300: "var(--brass-300)",
          400: "var(--brass-400)",
          500: "var(--brass-500)",
          600: "var(--brass-600)",
          700: "var(--brass-700)",
          800: "var(--brass-800)",
          900: "var(--brass-900)",
        },
        ink: {
          50: "var(--ink-50)",
          100: "var(--ink-100)",
          200: "var(--ink-200)",
          300: "var(--ink-300)",
          400: "var(--ink-400)",
          500: "var(--ink-500)",
          600: "var(--ink-600)",
          700: "var(--ink-700)",
          800: "var(--ink-800)",
          900: "var(--ink-900)",
          950: "var(--ink-950)",
        },
        bone: {
          50: "var(--bone-50)",
          100: "var(--bone-100)",
          150: "var(--bone-150)",
          200: "var(--bone-200)",
        },
        // Semantic colors. The 100/200/300 tints and the 700 shade are the
        // soft-fill and strong-text steps the UI already referenced (Badge
        // variants, error banners, Dashboard stat tiles) before they existed —
        // warm-tinted to sit beside Pine/Bone rather than reading as generic
        // pastels.
        moss: {
          100: "var(--moss-100)",
          200: "var(--moss-200)",
          400: "var(--moss-400)",
          500: "var(--moss-500)",
          600: "var(--moss-600)",
          700: "var(--moss-700)",
        },
        ochre: {
          100: "var(--ochre-100)",
          200: "var(--ochre-200)",
          400: "var(--ochre-400)",
          500: "var(--ochre-500)",
          600: "var(--ochre-600)",
          700: "var(--ochre-700)",
        },
        terracotta: {
          100: "var(--terracotta-100)",
          200: "var(--terracotta-200)",
          300: "var(--terracotta-300)",
          400: "var(--terracotta-400)",
          500: "var(--terracotta-500)",
          600: "var(--terracotta-600)",
          700: "var(--terracotta-700)",
        },
        steel: {
          100: "var(--steel-100)",
          200: "var(--steel-200)",
          400: "var(--steel-400)",
          500: "var(--steel-500)",
          600: "var(--steel-600)",
          700: "var(--steel-700)",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        // Custom typography scale
        xs: ["12px", { lineHeight: "1.4" }],
        sm: ["13.5px", { lineHeight: "1.5" }],
        base: ["15px", { lineHeight: "1.55" }],
        lg: ["16px", { lineHeight: "1.55" }],
        xl: ["18px", { lineHeight: "1.5" }],
        "2xl": ["20px", { lineHeight: "1.3" }],
        "3xl": ["26px", { lineHeight: "1.2" }],
        "4xl": ["34px", { lineHeight: "1.15" }],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
      },
      boxShadow: {
        xs: "0 1px 2px rgb(28 27 23 / 0.05)",
        sm: "0 1px 2px rgb(28 27 23 / 0.06), 0 2px 8px rgb(28 27 23 / 0.05)",
        md: "0 4px 12px rgb(28 27 23 / 0.08), 0 8px 24px rgb(28 27 23 / 0.06)",
        lg: "0 12px 32px rgb(28 27 23 / 0.16)",
      },
      animation: {
        "pulse-subtle": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      transitionDuration: {
        hover: "180ms",
        press: "120ms",
        transition: "200ms",
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(0.2, 0, 0, 1)",
      },
    },
  },
  plugins: [],
}


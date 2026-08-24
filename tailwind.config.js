/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Portico primary palette
        pine: {
          50: "#F0F5F2",
          100: "#DCECE3",
          200: "#BBD8C9",
          300: "#8FBCA6",
          400: "#5E9C82",
          500: "#3C7D63",
          600: "#2C6350",
          700: "#24503F",
          800: "#1E4134",
          900: "#183429",
          950: "#0E211A",
        },
        brass: {
          50: "#FAF4EA",
          100: "#F3E5CC",
          200: "#E6CB99",
          300: "#D9B06A",
          400: "#CB9447",
          500: "#B77B33",
          600: "#9C6226",
          700: "#7E4D1F",
          800: "#5F3B1B",
          900: "#462C17",
        },
        ink: {
          50: "#F7F6F3",
          100: "#EFEDE7",
          200: "#E2DFD5",
          300: "#CFCBBE",
          400: "#A9A496",
          500: "#837E70",
          600: "#5E5A4F",
          700: "#423F37",
          800: "#2B2924",
          900: "#1B1A16",
          950: "#12110E",
        },
        bone: {
          50: "#F6F4EF",
          100: "#FCFBF8",
          150: "#FAF9F6",
          200: "#EFECE3",
        },
        // Semantic colors. The 100/200/300 tints and the 700 shade are the
        // soft-fill and strong-text steps the UI already referenced (Badge
        // variants, error banners, Dashboard stat tiles) before they existed —
        // warm-tinted to sit beside Pine/Bone rather than reading as generic
        // pastels.
        moss: {
          100: "#E9EFDF",
          200: "#D4E0C0",
          400: "#9DB87C",
          500: "#6C8A4F",
          600: "#557040",
          700: "#425732",
        },
        ochre: {
          100: "#F7EBD6",
          200: "#EFD7AC",
          400: "#D9A860",
          500: "#A86E1D",
          600: "#8B5A16",
          700: "#6D4711",
        },
        terracotta: {
          100: "#F7E4DC",
          200: "#EFCABB",
          300: "#E2A78F",
          400: "#D0805F",
          500: "#B4543A",
          600: "#9C4530",
          700: "#7B3626",
        },
        steel: {
          100: "#E7EDF1",
          200: "#CDD9E1",
          400: "#86A0B4",
          500: "#547085",
          600: "#405165",
          700: "#33404F",
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


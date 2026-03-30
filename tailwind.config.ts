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
        brand: {
          cream: "#FAF7F2",
          parchment: "#F5F0E8",
          sand: "#E8DFD3",
          clay: "#D4A574",
          terracotta: "#C17A56",
          charcoal: "#2C2420",
          "warm-black": "#1A1614",
          sage: "#8B9D83",
          "sage-light": "#C5CEBC",
          coral: "#C75C3A",
          "coral-light": "#E8947A",
          mustard: "#C4922A",
          stone: "#A39B93",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "28px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        "soft": "0 2px 8px rgba(44, 36, 32, 0.06)",
        "soft-md": "0 4px 16px rgba(44, 36, 32, 0.08)",
        "soft-lg": "0 8px 32px rgba(44, 36, 32, 0.10)",
        "soft-xl": "0 16px 48px rgba(44, 36, 32, 0.12)",
        "inner-soft": "inset 0 1px 3px rgba(44, 36, 32, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;

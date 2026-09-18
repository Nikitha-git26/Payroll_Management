import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6fe",
          200: "#bfd3fe",
          300: "#93b4fd",
          400: "#608bfa",
          500: "#3b66f5",
          600: "#2547ea",
          700: "#1e37d6",
          800: "#1f30ad",
          900: "#1f2e88",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5d9e2",
          300: "#b1b9c8",
          400: "#8691a8",
          500: "#68738c",
          600: "#535c73",
          700: "#444b5e",
          800: "#3a3f4f",
          900: "#1c2130",
          950: "#12151f",
        },
        status: {
          good: "#0ca30c",
          warning: "#fab219",
          serious: "#ec835a",
          critical: "#d03b3b",
          onTrack: "#0ca30c",
          atRisk: "#fab219",
          blocked: "#d03b3b",
          completed: "#2a78d6",
          reconciled: "#0ca30c",
          unreconciled: "#d03b3b",
          review: "#fab219",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(16, 24, 40, 0.06), 0 1px 3px 0 rgba(16, 24, 40, 0.08)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;

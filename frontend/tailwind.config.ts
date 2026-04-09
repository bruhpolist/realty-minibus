import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "#f4f5f6",
          panel: "#ffffff",
          ink: "#101113",
          accent: "#0b6bcb",
          mint: "#0d9968"
        }
      },
      boxShadow: {
        soft: "0 8px 24px rgba(13, 18, 30, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

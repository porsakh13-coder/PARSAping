import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#05060d",
          900: "#0a0e1a",
          800: "#10152600",
        },
        neon: {
          blue: "#3ac8ff",
          purple: "#b14bff",
          green: "#39ff9c",
          pink: "#ff4bd8",
        },
      },
      fontFamily: {
        display: ["'Orbitron'", "sans-serif"],
        body: ["'Rajdhani'", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 8px rgba(58,200,255,0.6), 0 0 24px rgba(177,75,255,0.35)",
        "neon-green": "0 0 8px rgba(57,255,156,0.6), 0 0 24px rgba(57,255,156,0.25)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(58,200,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(58,200,255,0.06) 1px, transparent 1px)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        floatUp: {
          "0%": { transform: "translateY(6px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2.2s ease-in-out infinite",
        floatUp: "floatUp 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

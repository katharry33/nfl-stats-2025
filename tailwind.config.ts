// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  // FIX: Remove the square brackets around "class"
  darkMode: "class", 
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#22d3ee", // Example cyan-400
        loss: "#ef4444",
        profit: "#10b981",
          nba: '#f97316', // Orange
          nfl: '#22c55e', // Green
      },
    },
  },
  plugins: [],
  
};
export default config;
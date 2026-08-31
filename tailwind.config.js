/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        chat: {
          bg: "#0b141a",
          panel: "#111b21",
          header: "#202c33",
          hover: "#202c33",
          active: "#2a3942",
          bubbleOut: "#005c4b",
          bubbleIn: "#202c33",
          border: "#222e35",
          text: "#e9edef",
          muted: "#8696a0",
          accent: "#00a884",
        }
      },
    },
  },
  plugins: [],
};

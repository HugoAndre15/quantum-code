/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        black: {
          DEFAULT: "#282828",
          2: "#303030",
          3: "#383838",
          4: "#424242",
          5: "#1E1E1E",
        },
        blue: { DEFAULT: "#2D6FFF", 2: "#1A56E8" },
        gold: { DEFAULT: "#F0C040" },
        grey: { DEFAULT: "#ECECEC", 2: "#C4C4C4", 3: "#8A8A8A", 4: "#555555" },
        green: { DEFAULT: "#5DD8A0" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

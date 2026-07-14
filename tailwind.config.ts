import type { Config } from "tailwindcss"

export default {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#5d7066",
          hover: "#4a5c53",
          dark: "#7a9e8a",
        },
        surface: "#f1f1f1",
        accent: {
          DEFAULT: "#d9c6b0",
          dark: "#c4a882",
        },
      },
    },
  },
} satisfies Config

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a1a1a",
        // Canvas: neutro frio com um toque de índigo (combina com a marca; faz os
        // cards brancos "saltarem" sem perder sofisticação).
        paper: "#f1f2f8",
        surface: "#ffffff", // painéis/cards
        // Cor de marca — índigo moderno. Usada nos destaques ativos e botões primários.
        brand: {
          DEFAULT: "#4f46e5",
          dark: "#4338ca",
        },
      },
    },
  },
  plugins: [],
};
export default config;

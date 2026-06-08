import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a1a1a",
        paper: "#faf9f7",
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

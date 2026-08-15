import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Must match the GitHub Pages project path exactly, or every asset 404s
// once deployed to https://Anant-Madhok231.github.io/clerk-ai/.
export default defineConfig({
  base: "/clerk-ai/",
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});

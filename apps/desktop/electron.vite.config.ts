import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    // @clerk-ai/* are workspace ESM packages; bundling them (instead of
    // externalizing to a runtime require()) avoids an ESM-from-CJS crash in
    // Electron's main process, which loads out/main/index.js as CommonJS.
    plugins: [externalizeDepsPlugin({ exclude: ["@clerk-ai/core", "@clerk-ai/agent"] })],
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "src/shared"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ["@clerk-ai/core", "@clerk-ai/agent"] })],
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "src/shared"),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "src/shared"),
        "@": resolve(__dirname, "src/renderer/src"),
      },
    },
    plugins: [react()],
    build: {
      outDir: resolve(__dirname, "out/renderer"),
      rollupOptions: {
        input: resolve(__dirname, "src/renderer/index.html"),
      },
    },
  },
});

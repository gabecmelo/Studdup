import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/ — Vitest config merged in via vitest/config's defineConfig.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  // Fixed port so Tauri's devUrl can attach for `cargo tauri dev` (hot reload).
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
    globals: true,
    passWithNoTests: true,
  },
});

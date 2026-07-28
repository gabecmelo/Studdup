import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/ — Vitest config merged in via vitest/config's defineConfig.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  build: {
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
    globals: true,
    passWithNoTests: true,
  },
});

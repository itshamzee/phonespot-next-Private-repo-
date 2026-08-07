import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    // e2e/** holds Playwright specs, not Vitest specs — they use a different
    // test runner/API and were being collected (and failing) by mistake.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});

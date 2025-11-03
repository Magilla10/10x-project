import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/unit/**/*.{test,spec}.{ts,tsx}"],
    reporters: process.env.CI ? ["default", "junit"] : "default",
    outputFile: {
      junit: "reports/vitest/junit.xml",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "coverage/unit",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/env.d.ts", "**/*.d.ts", "**/*.stories.{ts,tsx}", "**/__tests__/**", "src/pages/**", "dist/**"],
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});

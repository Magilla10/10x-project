import dotenv from "dotenv";
import path from "path";
import { defineConfig, devices } from "@playwright/test";

// Załaduj zmienne z .env.test
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ["html", { open: "never" }],
        ["junit", { outputFile: "reports/playwright/junit.xml" }],
      ]
    : "html",
  webServer: {
    command: "npm run dev:e2e",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // W CI używamy env z GitHub Secrets, lokalnie Astro ładuje .env automatycznie
    env: process.env.CI
      ? {
          PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL || "",
          PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY || "",
          OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
        }
      : undefined,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    testIdAttribute: "data-test-id",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    launchOptions: {
      channel: "chrome",
      args: ["--disable-dev-shm-usage"],
    },
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
  ],
  outputDir: "reports/playwright/artifacts",
});

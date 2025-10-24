import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("displays welcome message", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("AI Flashcard");
  });
});

import type { Page, Locator } from "@playwright/test";

/**
 * Bazowa klasa Page Object zawierająca podstawowe metody
 */
export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Przechodzi na stronę główną
   */
  async gotoHome(): Promise<void> {
    await this.page.goto("/");
  }

  /**
   * Pobiera element po data-test-id
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }
}

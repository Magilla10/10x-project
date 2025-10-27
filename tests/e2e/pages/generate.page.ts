import { BasePage } from "./base.page";
import type { Locator } from "@playwright/test";

/**
 * Page Object dla strony generowania fiszek
 */
export class GeneratePage extends BasePage {
  /**
   * Przechodzi na stronę generowania fiszek
   */
  async goto(): Promise<void> {
    await this.page.goto("/generate");
  }

  /**
   * Pobiera przycisk wylogowania (z komponentu AuthStatus)
   */
  getLogoutButton(): Locator {
    return this.getByTestId("auth-logout-button");
  }

  /**
   * Sprawdza czy użytkownik jest zalogowany
   * (przycisk wylogowania powinien być widoczny)
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.getLogoutButton().waitFor({ state: "visible", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}


import { BasePage } from "./base.page";
import type { Locator } from "@playwright/test";

/**
 * Page Object dla strony głównej aplikacji
 */
export class HomePage extends BasePage {
  /**
   * Przechodzi na stronę główną
   */
  async goto(): Promise<void> {
    await this.gotoHome();
  }

  /**
   * Pobiera przycisk logowania
   */
  getLoginButton(): Locator {
    return this.getByTestId("homepage-login-button");
  }

  /**
   * Pobiera przycisk rejestracji
   */
  getRegisterButton(): Locator {
    return this.getByTestId("homepage-register-button");
  }
}

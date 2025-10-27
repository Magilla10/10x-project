import { BasePage } from "./base.page";
import type { Locator } from "@playwright/test";

/**
 * Page Object dla strony rejestracji
 */
export class RegisterPage extends BasePage {
  /**
   * Przechodzi na stronę rejestracji
   */
  async goto(): Promise<void> {
    await this.page.goto("/register");
  }

  /**
   * Pobiera pole email
   */
  getEmailInput(): Locator {
    return this.getByTestId("register-email-input");
  }

  /**
   * Pobiera pole imienia i nazwiska
   */
  getDisplayNameInput(): Locator {
    return this.getByTestId("register-display-name-input");
  }

  /**
   * Pobiera pole hasła
   */
  getPasswordInput(): Locator {
    return this.getByTestId("register-password-input");
  }

  /**
   * Pobiera pole powtórzenia hasła
   */
  getConfirmPasswordInput(): Locator {
    return this.getByTestId("register-confirm-password-input");
  }

  /**
   * Pobiera przycisk rejestracji
   */
  getSubmitButton(): Locator {
    return this.getByTestId("register-submit-button");
  }
}

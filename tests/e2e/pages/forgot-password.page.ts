import { BasePage } from "./base.page";
import type { Locator } from "@playwright/test";

/**
 * Page Object dla strony forgot-password
 */
export class ForgotPasswordPage extends BasePage {
  /**
   * Przechodzi na stronę forgot-password
   */
  async goto(): Promise<void> {
    await this.page.goto("/forgot-password");
  }

  /**
   * Pobiera pole email
   */
  getEmailInput(): Locator {
    return this.getByTestId("forgot-email-input");
  }

  /**
   * Pobiera przycisk wysyłania instrukcji
   */
  getSubmitButton(): Locator {
    return this.getByTestId("forgot-submit-button");
  }

  /**
   * Wysyła instrukcję resetowania hasła
   */
  async requestPasswordReset(email: string): Promise<void> {
    const emailInput = this.getEmailInput();

    // Wypełnij email
    await emailInput.click();
    await emailInput.fill(email);
    await this.page.waitForTimeout(100);

    // Kliknij przycisk wysyłania
    await this.getSubmitButton().click();
  }

  /**
   * Pobiera komunikat sukcesu
   */
  getSuccessMessage(): Locator {
    return this.page.locator("text=Jeśli konto istnieje, wysłaliśmy instrukcję resetu hasła na podany adres e-mail.");
  }

  /**
   * Pobiera komunikat błędu walidacji
   */
  getValidationError(): Locator {
    return this.page.locator("#forgot-email-error");
  }
}

import { BasePage } from "./base.page";
import type { Locator } from "@playwright/test";

/**
 * Page Object dla strony logowania
 */
export class LoginPage extends BasePage {
  /**
   * Przechodzi na stronę logowania
   */
  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  /**
   * Pobiera pole email
   */
  getEmailInput(): Locator {
    return this.getByTestId("login-email-input");
  }

  /**
   * Pobiera pole hasła
   */
  getPasswordInput(): Locator {
    return this.getByTestId("login-password-input");
  }

  /**
   * Pobiera przycisk logowania
   */
  getSubmitButton(): Locator {
    return this.getByTestId("login-submit-button");
  }

  /**
   * Loguje użytkownika
   */
  async login(email: string, password: string): Promise<void> {
    const emailInput = this.getEmailInput();
    const passwordInput = this.getPasswordInput();
    
    // Wypełnij email i poczekaj na załadowanie
    await emailInput.click();
    await emailInput.fill(email);
    await this.page.waitForTimeout(100);
    
    // Wypełnij hasło i poczekaj na załadowanie
    await passwordInput.click();
    await passwordInput.fill(password);
    await this.page.waitForTimeout(100);
    
    // Kliknij przycisk logowania
    await this.getSubmitButton().click();
  }

  /**
   * Pobiera komunikat błędu (jeśli istnieje)
   */
  getErrorMessage(): Locator {
    return this.page.locator("text=Podaj adres e-mail i hasło.");
  }
}

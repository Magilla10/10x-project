import { test, expect } from "@playwright/test";
import { LoginPage, GeneratePage, ForgotPasswordPage } from "./pages";
import { getTestCredentials } from "./helpers/auth.helper";

test.describe("Testy autentykacji", () => {
  let loginPage: LoginPage;
  let generatePage: GeneratePage;
  let forgotPasswordPage: ForgotPasswordPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    generatePage = new GeneratePage(page);
    forgotPasswordPage = new ForgotPasswordPage(page);
  });

  test("użytkownik może się zalogować i zostaje przekierowany na stronę generowania", async ({ page }) => {
    const { username, password } = getTestCredentials();

    // Przejdź do strony logowania
    await loginPage.goto();
    await page.waitForLoadState("networkidle");

    // Wypełnij formularz
    await loginPage.getEmailInput().fill(username);
    await loginPage.getPasswordInput().fill(password);

    // Kliknij przycisk logowania i poczekaj na nawigację
    await Promise.all([
      loginPage.getSubmitButton().click(),
      page.waitForURL(/\/generate/, { timeout: 15_000, waitUntil: "networkidle" }),
    ]);

    // Sprawdź czy jesteśmy na stronie /generate
    expect(page.url()).toContain("/generate");

    // Sprawdź czy przycisk wylogowania jest widoczny (dowód że użytkownik jest zalogowany)
    await expect(generatePage.getLogoutButton()).toBeVisible({ timeout: 10_000 });
  });

  test.skip("zalogowany użytkownik widzi przycisk wylogowania z emailem", async ({ page }) => {
    const { username, password } = getTestCredentials();

    await loginPage.goto();
    await loginPage.login(username, password);

    // Poczekaj na przekierowanie
    await page.waitForURL(/\/generate/);

    // Sprawdź czy użytkownik jest zalogowany
    const isLoggedIn = await generatePage.isLoggedIn();
    expect(isLoggedIn).toBe(true);

    // Sprawdź czy email jest wyświetlany (na desktopie)
    const emailElement = page.locator(`text=${username}`);
    await expect(emailElement).toBeVisible();
  });

  test.skip("użytkownik może się wylogować", async ({ page }) => {
    const { username, password } = getTestCredentials();

    // Zaloguj się
    await loginPage.goto();
    await loginPage.login(username, password);
    await page.waitForURL(/\/generate/);

    // Wyloguj się
    await generatePage.getLogoutButton().click();

    // Sprawdź czy nastąpiło przekierowanie na stronę główną
    await page.waitForURL("/");

    // Sprawdź czy przyciski logowania i rejestracji są widoczne (dowód że jest wylogowany)
    const loginButton = page.locator('a[href="/login"]');
    await expect(loginButton).toBeVisible();
  });

  test("użytkownik może przejść do strony forgot-password z formularza logowania", async ({ page }) => {
    // Przejdź do strony logowania
    await loginPage.goto();

    // Sprawdź czy link "Nie pamiętasz hasła?" jest widoczny
    const forgotPasswordLink = page.locator('a[href="/forgot-password"]');
    await expect(forgotPasswordLink).toBeVisible();

    // Kliknij link
    await forgotPasswordLink.click();

    // Sprawdź czy nastąpiło przekierowanie na stronę forgot-password
    await page.waitForURL("/forgot-password");

    // Sprawdź czy formularz forgot-password jest widoczny
    await expect(forgotPasswordPage.getEmailInput()).toBeVisible();
    await expect(forgotPasswordPage.getSubmitButton()).toBeVisible();
  });

  test.skip("użytkownik może wysłać prośbę o reset hasła", async () => {
    const { username } = getTestCredentials();

    // Przejdź do strony forgot-password
    await forgotPasswordPage.goto();

    // Wypełnij formularz i wyślij prośbę
    await forgotPasswordPage.requestPasswordReset(username);

    // Sprawdź czy pojawił się komunikat sukcesu
    await expect(forgotPasswordPage.getSuccessMessage()).toBeVisible();
  });

  test("formularz forgot-password waliduje email", async () => {
    // Przejdź do strony forgot-password
    await forgotPasswordPage.goto();

    // Spróbuj wysłać pusty formularz
    await forgotPasswordPage.getSubmitButton().click();

    // Sprawdź czy pojawił się błąd walidacji
    await expect(forgotPasswordPage.getValidationError()).toBeVisible();
  });
});

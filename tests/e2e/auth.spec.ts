import { test, expect } from "@playwright/test";
import { LoginPage, GeneratePage } from "./pages";
import { getTestCredentials } from "./helpers/auth.helper";

test.describe("Testy autentykacji", () => {
  let loginPage: LoginPage;
  let generatePage: GeneratePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    generatePage = new GeneratePage(page);
  });

  test("użytkownik może się zalogować i zostaje przekierowany na stronę generowania", async ({ page }) => {
    const { username, password } = getTestCredentials();

    // Przejdź do strony logowania
    await loginPage.goto();

    // Wypełnij formularz i zaloguj się
    await loginPage.login(username, password);

    // Sprawdź czy nastąpiło przekierowanie na /generate
    await page.waitForURL(/\/generate/);

    // Sprawdź czy przycisk wylogowania jest widoczny (dowód że użytkownik jest zalogowany)
    await expect(generatePage.getLogoutButton()).toBeVisible();
  });

  test("zalogowany użytkownik widzi przycisk wylogowania z emailem", async ({ page }) => {
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
});

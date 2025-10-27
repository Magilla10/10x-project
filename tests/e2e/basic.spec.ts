import { test, expect } from "@playwright/test";
import { HomePage, LoginPage, RegisterPage } from "./pages";

test.describe("Podstawowe testy aplikacji", () => {
  let homePage: HomePage;
  let loginPage: LoginPage;
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
  });

  test("strona główna zawiera przyciski Zaloguj się i Rejestracja", async () => {
    await homePage.goto();

    // Sprawdź czy przyciski są widoczne
    await expect(homePage.getLoginButton()).toBeVisible();
    await expect(homePage.getRegisterButton()).toBeVisible();
  });

  test("formularz logowania zawiera wymagane pola", async () => {
    await homePage.goto();
    await homePage.getLoginButton().click();

    // Sprawdź czy jesteśmy na stronie logowania
    await expect(loginPage.getEmailInput()).toBeVisible();
    await expect(loginPage.getPasswordInput()).toBeVisible();
    await expect(loginPage.getSubmitButton()).toBeVisible();
  });

  test("formularz rejestracji zawiera wymagane pola", async () => {
    await homePage.goto();
    await homePage.getRegisterButton().click();

    // Sprawdź czy jesteśmy na stronie rejestracji
    await expect(registerPage.getEmailInput()).toBeVisible();
    await expect(registerPage.getDisplayNameInput()).toBeVisible();
    await expect(registerPage.getPasswordInput()).toBeVisible();
    await expect(registerPage.getConfirmPasswordInput()).toBeVisible();
    await expect(registerPage.getSubmitButton()).toBeVisible();
  });
});

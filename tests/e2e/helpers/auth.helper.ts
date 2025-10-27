/**
 * Helper dla autentykacji w testach E2E
 */

/**
 * Pobiera dane testowego użytkownika ze zmiennych środowiskowych
 * @throws {Error} Jeśli brak wymaganych zmiennych środowiskowych
 */
export function getTestCredentials() {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "Brak danych testowych! Upewnij się, że E2E_USERNAME i E2E_PASSWORD są ustawione w pliku .env.test\n" +
        "Skopiuj .env.test.example jako .env.test i wypełnij danymi użytkownika testowego."
    );
  }

  return { username, password };
}

import type { AuthError } from "@supabase/supabase-js";

const SUPABASE_ERROR_TRANSLATIONS: Record<string, string> = {
  "AuthApiError: Invalid login credentials": "Nieprawidłowy e-mail lub hasło.",
  "AuthApiError: Email not confirmed": "Potwierdź adres e-mail, aby się zalogować.",
  "AuthError: Email signups are disabled": "Rejestracja przy użyciu e-maila jest obecnie wyłączona.",
};

export function resolveAuthErrorMessage(error: unknown, fallback: string) {
  if (!error) {
    return fallback;
  }

  const messageFromObject = (() => {
    if (typeof error === "string") {
      return error;
    }

    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }

    if (typeof error === "object" && error !== null) {
      const maybeAuthError = error as Partial<AuthError>;
      const name = maybeAuthError.name ?? "AuthError";
      const message = maybeAuthError.message ?? "";
      if (message) {
        return `${name}: ${message}`;
      }
    }

    return undefined;
  })();

  if (!messageFromObject) {
    return fallback;
  }

  return SUPABASE_ERROR_TRANSLATIONS[messageFromObject] ?? messageFromObject ?? fallback;
}

export const GENERIC_LOGIN_ERROR = "Nie udało się zalogować. Spróbuj ponownie za chwilę.";
export const GENERIC_REGISTER_ERROR = "Nie udało się utworzyć konta. Spróbuj ponownie.";
export const GENERIC_FORGOT_PASSWORD_ERROR = "Nie udało się wysłać wiadomości resetującej hasło.";
export const GENERIC_RESET_PASSWORD_ERROR = "Nie udało się zmienić hasła. Spróbuj ponownie.";

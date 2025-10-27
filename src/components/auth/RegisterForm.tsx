import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseAuthClient } from "@/lib/auth/hooks/useSupabaseAuthClient";
import { GENERIC_REGISTER_ERROR, resolveAuthErrorMessage } from "@/lib/auth/messages";
import { persistSessionTokens } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

interface RegisterFormProps {
  className?: string;
}

export function RegisterForm({ className }: RegisterFormProps) {
  const supabase = useSupabaseAuthClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEmailInvalid = email.trim().length === 0;
  const isPasswordInvalid = password.trim().length < 8;
  const isConfirmPasswordInvalid = confirmPassword.trim().length === 0 || confirmPassword !== password;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError(null);
    setFormSuccess(null);

    if (isEmailInvalid || isPasswordInvalid || isConfirmPasswordInvalid) {
      setFormError("Uzupełnij poprawnie wymagane pola.");
      return;
    }

    startTransition(async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: displayName ? { display_name: displayName } : undefined,
        },
      });

      if (error) {
        setFormError(resolveAuthErrorMessage(error, GENERIC_REGISTER_ERROR));
        setFormSuccess(null);
        return;
      }

      if (data.user && !data.session) {
        setFormSuccess("Sprawdź skrzynkę e-mail i potwierdź rejestrację.");
        return;
      }

      setFormSuccess("Konto utworzone! Przekierowujemy...");
      if (data.session) {
        persistSessionTokens(data.session);
      }
      window.location.href = "/generate";
    });
  };

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl">Załóż konto</CardTitle>
        <CardDescription>Wypełnij formularz, aby utworzyć nowe konto w 10xDevs.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="register-email">Adres e-mail</Label>
              <Input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="jan.kowalski@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={isEmailInvalid ? "true" : undefined}
                aria-describedby={isEmailInvalid ? "register-email-error" : undefined}
                disabled={isPending}
                data-test-id="register-email-input"
              />
              {isEmailInvalid ? (
                <p id="register-email-error" className="text-sm text-destructive">
                  Wprowadź poprawny adres e-mail.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-display-name">Imię i nazwisko (opcjonalnie)</Label>
              <Input
                id="register-display-name"
                name="displayName"
                autoComplete="name"
                placeholder="Jan Kowalski"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={isPending}
                data-test-id="register-display-name-input"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="register-password">Hasło</Label>
                <Input
                  id="register-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimum 8 znaków"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={isPasswordInvalid ? "true" : undefined}
                  aria-describedby={isPasswordInvalid ? "register-password-error" : undefined}
                  disabled={isPending}
                  data-test-id="register-password-input"
                />
                {isPasswordInvalid ? (
                  <p id="register-password-error" className="text-sm text-destructive">
                    Hasło musi zawierać minimum 8 znaków.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">Powtórz hasło</Label>
                <Input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Powtórz hasło"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={isConfirmPasswordInvalid ? "true" : undefined}
                  aria-describedby={isConfirmPasswordInvalid ? "register-confirm-password-error" : undefined}
                  disabled={isPending}
                  data-test-id="register-confirm-password-input"
                />
                {isConfirmPasswordInvalid ? (
                  <p id="register-confirm-password-error" className="text-sm text-destructive">
                    Hasła muszą być takie same.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {formError ? <p className="text-sm text-center text-destructive">{formError}</p> : null}
            {formSuccess ? <p className="text-sm text-center text-green-600">{formSuccess}</p> : null}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isPending} data-test-id="register-submit-button">
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Tworzenie konta...
              </span>
            ) : (
              "Załóż konto"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseAuthClient } from "@/lib/auth/hooks/useSupabaseAuthClient";
import { GENERIC_RESET_PASSWORD_ERROR, resolveAuthErrorMessage } from "@/lib/auth/messages";
import { persistSessionTokens } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

interface ResetPasswordFormProps {
  className?: string;
  token?: string;
}

export function ResetPasswordForm({ className, token }: ResetPasswordFormProps) {
  const supabase = useSupabaseAuthClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPasswordInvalid = password.trim().length < 8;
  const isConfirmPasswordInvalid = confirmPassword.trim().length === 0 || confirmPassword !== password;

  useEffect(() => {
    if (!token) {
      setFormError("Link do resetu hasła jest nieprawidłowy lub wygasł.");
      return;
    }

    let cancelled = false;

    const exchange = async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(token);
        if (cancelled) {
          return;
        }

        if (error) {
          setFormError(resolveAuthErrorMessage(error, "Link do resetu hasła jest nieprawidłowy lub wygasł."));
          return;
        }

        if (data.session) {
          persistSessionTokens(data.session);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Supabase password recovery session exchange failed", error);
          setFormError(resolveAuthErrorMessage(error, "Link do resetu hasła jest nieprawidłowy lub wygasł."));
        }
      }
    };

    void exchange();

    return () => {
      cancelled = true;
    };
  }, [supabase, token]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (isPasswordInvalid || isConfirmPasswordInvalid) {
      setFormError("Uzupełnij poprawnie wymagane pola.");
      return;
    }

    startTransition(async () => {
      const { data, error } = await supabase.auth.updateUser({ password });

      if (error) {
        setFormError(resolveAuthErrorMessage(error, GENERIC_RESET_PASSWORD_ERROR));
        setFormSuccess(null);
        return;
      }

      if (data.session) {
        persistSessionTokens(data.session);
      }

      setFormSuccess("Hasło zostało zaktualizowane. Możesz się teraz zalogować.");
      setPassword("");
      setConfirmPassword("");
    });
  };

  const disableInputs = isPending || Boolean(formSuccess);

  return (
    <Card className={cn("w-full max-w-lg", className)}>
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl">Ustaw nowe hasło</CardTitle>
        <CardDescription>
          Wprowadź nowe hasło dla swojego konta. Po zapisaniu zalogujesz się ponownie używając nowych danych.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="reset-password">Nowe hasło</Label>
            <Input
              id="reset-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimum 8 znaków"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={isPasswordInvalid ? "true" : undefined}
              aria-describedby={isPasswordInvalid ? "reset-password-error" : undefined}
              disabled={disableInputs}
            />
            {isPasswordInvalid ? (
              <p id="reset-password-error" className="text-sm text-destructive">
                Hasło musi zawierać minimum 8 znaków.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm-password">Powtórz hasło</Label>
            <Input
              id="reset-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Powtórz hasło"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={isConfirmPasswordInvalid ? "true" : undefined}
              aria-describedby={isConfirmPasswordInvalid ? "reset-confirm-password-error" : undefined}
              disabled={disableInputs}
            />
            {isConfirmPasswordInvalid ? (
              <p id="reset-confirm-password-error" className="text-sm text-destructive">
                Hasła muszą być takie same.
              </p>
            ) : null}
          </div>

          {formError ? <p className="text-sm text-center text-destructive">{formError}</p> : null}
          {formSuccess ? <p className="text-sm text-center text-emerald-600">{formSuccess}</p> : null}

          <Button type="submit" className="w-full" size="lg" disabled={disableInputs}>
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Zapisywanie...
              </span>
            ) : (
              "Zapisz hasło"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

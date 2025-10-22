import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseAuthClient } from "@/lib/auth/hooks/useSupabaseAuthClient";
import { GENERIC_LOGIN_ERROR, resolveAuthErrorMessage } from "@/lib/auth/messages";
import { persistSessionTokens } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  className?: string;
}

export function LoginForm({ className }: LoginFormProps) {
  const supabase = useSupabaseAuthClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEmailInvalid = email.trim().length === 0;
  const isPasswordInvalid = password.trim().length === 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (isEmailInvalid || isPasswordInvalid) {
      setFormError("Podaj adres e-mail i hasło.");
      return;
    }

    startTransition(async () => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.session) {
          setFormError(resolveAuthErrorMessage(error, GENERIC_LOGIN_ERROR));
          return;
        }

        persistSessionTokens(data.session);
        window.location.href = "/generate";
      } catch (error) {
        setFormError(resolveAuthErrorMessage(error, GENERIC_LOGIN_ERROR));
      }
    });
  };

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl">Zaloguj się</CardTitle>
        <CardDescription>Wprowadź swoje dane logowania, aby kontynuować.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="login-email">Adres e-mail</Label>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="jan.kowalski@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={isEmailInvalid ? "true" : undefined}
                aria-describedby={isEmailInvalid ? "login-email-error" : undefined}
                disabled={isPending}
              />
              {isEmailInvalid ? (
                <p id="login-email-error" className="text-sm text-destructive">
                  Wprowadź poprawny adres e-mail.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Hasło</Label>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={isPasswordInvalid ? "true" : undefined}
                aria-describedby={isPasswordInvalid ? "login-password-error" : undefined}
                disabled={isPending}
              />
              {isPasswordInvalid ? (
                <p id="login-password-error" className="text-sm text-destructive">
                  Wprowadź hasło.
                </p>
              ) : null}
            </div>
          </div>

          {formError ? <p className="text-sm text-center text-destructive">{formError}</p> : null}

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Logowanie...
              </span>
            ) : (
              "Zaloguj się"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

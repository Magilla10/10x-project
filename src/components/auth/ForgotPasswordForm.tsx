import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseAuthClient } from "@/lib/auth/hooks/useSupabaseAuthClient";
import { GENERIC_FORGOT_PASSWORD_ERROR, resolveAuthErrorMessage } from "@/lib/auth/messages";
import { cn } from "@/lib/utils";

interface ForgotPasswordFormProps {
  className?: string;
}

export function ForgotPasswordForm({ className }: ForgotPasswordFormProps) {
  const supabase = useSupabaseAuthClient();
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEmailInvalid = email.trim().length === 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFeedback(null);

    if (isEmailInvalid) {
      setFormError("Wprowadź poprawny adres e-mail.");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setFormError(resolveAuthErrorMessage(error, GENERIC_FORGOT_PASSWORD_ERROR));
        setFeedback(null);
        return;
      }

      setFeedback("Jeśli konto istnieje, wysłaliśmy instrukcję resetu hasła na podany adres e-mail.");
    });
  };

  return (
    <Card className={cn("w-full max-w-lg", className)}>
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl">Odzyskaj dostęp</CardTitle>
        <CardDescription>Podaj adres e-mail, na który wyślemy instrukcję resetu hasła.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Adres e-mail</Label>
            <Input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="jan.kowalski@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={isEmailInvalid ? "true" : undefined}
              aria-describedby={isEmailInvalid ? "forgot-email-error" : undefined}
              disabled={isPending}
            />
            {isEmailInvalid ? (
              <p id="forgot-email-error" className="text-sm text-destructive">
                Wprowadź poprawny adres e-mail.
              </p>
            ) : null}
          </div>

          {formError ? <p className="text-sm text-center text-destructive">{formError}</p> : null}
          {feedback ? <p className="text-sm text-center text-green-600">{feedback}</p> : null}

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Wysyłanie...
              </span>
            ) : (
              "Wyślij instrukcję"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

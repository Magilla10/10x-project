import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postCreateManualFlashcard, ApiError } from "@/lib/api/aiGenerationsClient";
import { validateFlashcardFront, validateFlashcardBack, countCodePoints } from "@/lib/utils/validation";

interface ManualFlashcardFormProps {
  remainingSlots: number;
  onCreated?: () => void;
}

/**
 * Form for manually creating a single flashcard
 */
export function ManualFlashcardForm({ remainingSlots, onCreated }: ManualFlashcardFormProps) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);

  const frontValidation = validateFlashcardFront(front);
  const backValidation = validateFlashcardBack(back);
  const frontLength = countCodePoints(front);
  const backLength = countCodePoints(back);

  const canSubmit = frontValidation.isValid && backValidation.isValid && !isSubmitting && remainingSlots > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(undefined);
    setSuccess(false);

    try {
      await postCreateManualFlashcard({
        front: front.trim(),
        back: back.trim(),
        source: "manual",
      });

      setSuccess(true);
      setFront("");
      setBack("");
      setTimeout(() => setSuccess(false), 3000);

      if (onCreated) {
        onCreated();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Nie udało się utworzyć fiszki");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utwórz fiszkę ręcznie</CardTitle>
        <CardDescription>Dodaj pojedynczą fiszkę bez użycia AI</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Front */}
        <div>
          <label htmlFor="manual-flashcard-front" className="block text-sm font-medium mb-2">
            Przód fiszki (pytanie)
          </label>
          <textarea
            id="manual-flashcard-front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            rows={2}
            placeholder="Co chcesz zapamiętać?"
            disabled={isSubmitting || remainingSlots === 0}
            className={cn(
              "w-full px-3 py-2 rounded-md border bg-background resize-y",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "disabled:opacity-50",
              !frontValidation.isValid && front.length > 0 && "border-destructive"
            )}
          />
          <div className="flex justify-between mt-1 text-xs">
            {!frontValidation.isValid && front.length > 0 ? (
              <p className="text-destructive">{frontValidation.error}</p>
            ) : (
              <p className="text-muted-foreground">10-200 znaków</p>
            )}
            <p className={cn(frontLength >= 10 && frontLength <= 200 ? "text-green-600" : "text-muted-foreground")}>
              {frontLength}/200
            </p>
          </div>
        </div>

        {/* Back */}
        <div>
          <label htmlFor="manual-flashcard-back" className="block text-sm font-medium mb-2">
            Tył fiszki (odpowiedź)
          </label>
          <textarea
            id="manual-flashcard-back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            rows={4}
            placeholder="Odpowiedź lub wyjaśnienie..."
            disabled={isSubmitting || remainingSlots === 0}
            className={cn(
              "w-full px-3 py-2 rounded-md border bg-background resize-y",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "disabled:opacity-50",
              !backValidation.isValid && back.length > 0 && "border-destructive"
            )}
          />
          <div className="flex justify-between mt-1 text-xs">
            {!backValidation.isValid && back.length > 0 ? (
              <p className="text-destructive">{backValidation.error}</p>
            ) : (
              <p className="text-muted-foreground">10-500 znaków</p>
            )}
            <p className={cn(backLength >= 10 && backLength <= 500 ? "text-green-600" : "text-muted-foreground")}>
              {backLength}/500
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-md bg-green-50 border border-green-500 dark:bg-green-950/20">
            <p className="text-sm text-green-700 dark:text-green-400">Fiszka została utworzona!</p>
          </div>
        )}

        {remainingSlots === 0 && (
          <div className="p-3 rounded-md bg-yellow-50 border border-yellow-500 dark:bg-yellow-950/20">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Osiągnięto limit 15 fiszek. Usuń niektóre, aby dodać nowe.
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? "Dodawanie..." : "Dodaj fiszkę"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postCreateManualFlashcard, ApiError } from "@/lib/api/aiGenerationsClient";
import { validateFlashcardFront, validateFlashcardBack, countCodePoints } from "@/lib/utils/validation";

interface ManualFlashcardFormProps {
  remainingSlots?: number;
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

  const limitReached = typeof remainingSlots === "number" && remainingSlots <= 0;

  const canSubmit = frontValidation.isValid && backValidation.isValid && !isSubmitting && !limitReached;

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
    <Card className="border-white/15 bg-white/10 text-white shadow-2xl shadow-indigo-950/20 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-white">Utwórz fiszkę ręcznie</CardTitle>
        <CardDescription className="text-white/70">Dodaj pojedynczą fiszkę bez użycia AI</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Front */}
        <div>
          <label htmlFor="manual-flashcard-front" className="mb-2 block text-sm font-medium text-white/80">
            Przód fiszki (pytanie)
          </label>
          <textarea
            id="manual-flashcard-front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            rows={2}
            placeholder="Co chcesz zapamiętać?"
            disabled={isSubmitting || limitReached}
            className={cn(
              "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white shadow-lg shadow-indigo-950/20 transition",
              "placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-300/80",
              "disabled:opacity-50",
              !frontValidation.isValid && front.length > 0 && "border-red-400/80 focus:ring-red-300/70"
            )}
            data-test-id="flashcard-front-input"
          />
          <div className="mt-2 flex justify-between text-xs">
            {!frontValidation.isValid && front.length > 0 ? (
              <p className="text-red-300">{frontValidation.error}</p>
            ) : (
              <p className="text-white/60">10-200 znaków</p>
            )}
            <p className={cn(frontLength >= 10 && frontLength <= 200 ? "text-emerald-300" : "text-white/50")}>
              {frontLength}/200
            </p>
          </div>
        </div>

        {/* Back */}
        <div>
          <label htmlFor="manual-flashcard-back" className="mb-2 block text-sm font-medium text-white/80">
            Tył fiszki (odpowiedź)
          </label>
          <textarea
            id="manual-flashcard-back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            rows={4}
            placeholder="Odpowiedź lub wyjaśnienie..."
            disabled={isSubmitting || limitReached}
            className={cn(
              "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white shadow-lg shadow-indigo-950/20 transition",
              "placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-300/80",
              "disabled:opacity-50",
              !backValidation.isValid && back.length > 0 && "border-red-400/80 focus:ring-red-300/70"
            )}
            data-test-id="flashcard-back-input"
          />
          <div className="mt-2 flex justify-between text-xs">
            {!backValidation.isValid && back.length > 0 ? (
              <p className="text-red-300">{backValidation.error}</p>
            ) : (
              <p className="text-white/60">10-500 znaków</p>
            )}
            <p className={cn(backLength >= 10 && backLength <= 500 ? "text-emerald-300" : "text-white/50")}>
              {backLength}/500
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="rounded-xl border border-red-300/60 bg-red-500/15 p-3">
            <p className="text-sm text-red-100/90">{error}</p>
          </div>
        )}

        {success && (
          <div
            className="rounded-xl border border-emerald-300/60 bg-emerald-400/15 p-3"
            data-test-id="flashcard-created-message"
          >
            <p className="text-sm text-emerald-100">Fiszka została utworzona!</p>
          </div>
        )}

        {limitReached && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-400/15 p-3">
            <p className="text-sm text-amber-100">Osiągnięto limit 15 fiszek. Usuń niektóre, aby dodać nowe.</p>
          </div>
        )}

        {/* Navigation & Submit */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="shadow-lg shadow-indigo-500/30"
            data-test-id="add-flashcard-button"
          >
            {isSubmitting ? "Dodawanie..." : "Dodaj fiszkę"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

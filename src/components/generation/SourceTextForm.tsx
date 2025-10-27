import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GenerationFormState } from "@/lib/viewModels/generationView";
import { validateSourceText, countCodePoints } from "@/lib/utils/validation";

interface SourceTextFormProps {
  value: GenerationFormState;
  onChange: (next: GenerationFormState) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

/**
 * Form for inputting source text and generation parameters
 * Handles inline validation and submission
 */
export function SourceTextForm({ value, onChange, onSubmit, isSubmitting }: SourceTextFormProps) {
  const [sourceTextError, setSourceTextError] = useState<string>();

  // Validate source text on change
  useEffect(() => {
    const validation = validateSourceText(value.sourceText);
    if (!validation.isValid && value.sourceText.trim().length > 0) {
      setSourceTextError(validation.error);
    } else {
      setSourceTextError(undefined);
    }
  }, [value.sourceText]);

  const handleSubmitClick = () => {
    if (!validateSourceText(value.sourceText).isValid) {
      return;
    }
    onSubmit();
  };

  const currentLength = countCodePoints(value.sourceText);
  const isValid = validateSourceText(value.sourceText).isValid;
  const canSubmit = isValid && !isSubmitting;

  return (
    <Card className="border-white/15 bg-white/10 text-white shadow-2xl shadow-indigo-950/30 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-white">Tekst źródłowy</CardTitle>
        <CardDescription className="text-white/70">
          Wklej tekst do analizy (1000-10000 znaków). AI wygeneruje maksymalnie {value.maxFlashcards} fiszek.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source Text */}
        <div>
          <textarea
            value={value.sourceText}
            onChange={(e) => onChange({ ...value, sourceText: e.target.value })}
            placeholder="Wklej tutaj tekst do nauki (np. notatki z wykładu, artykuł, fragment książki)..."
            rows={12}
            disabled={isSubmitting}
            className={cn(
              "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white shadow-lg shadow-indigo-950/20 transition",
              "placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-300/80 disabled:opacity-50",
              sourceTextError && "border-red-400/80"
            )}
          />
          <div className="mt-2 flex items-center justify-between text-sm">
            {sourceTextError ? (
              <p className="text-red-300">{sourceTextError}</p>
            ) : (
              <p className="text-white/60">Wymagane: 1000-10000 znaków</p>
            )}
            <p
              className={cn(
                "font-mono",
                currentLength >= 1000 && currentLength <= 10000 ? "text-emerald-300" : "text-white/50"
              )}
            >
              {currentLength} / 10000
            </p>
          </div>
        </div>

        {/* Max Flashcards */}
        <div>
          <label htmlFor="maxFlashcards" className="mb-2 block text-sm font-medium text-white/80">
            Maksymalna liczba fiszek
          </label>
          <input
            id="maxFlashcards"
            type="number"
            min={1}
            max={15}
            value={value.maxFlashcards}
            onChange={(e) => onChange({ ...value, maxFlashcards: parseInt(e.target.value, 10) || 10 })}
            disabled={isSubmitting}
            className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-base text-white shadow-lg shadow-indigo-950/20 focus:outline-none focus:ring-2 focus:ring-indigo-300/80 disabled:opacity-50"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmitClick}
            disabled={!canSubmit}
            size="lg"
            className="shadow-lg shadow-indigo-500/30"
          >
            {isSubmitting ? "Generowanie..." : "Generuj fiszki"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

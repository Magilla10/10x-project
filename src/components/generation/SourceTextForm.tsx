import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GenerationFormState } from "@/lib/viewModels/generationView";
import {
  validateSourceText,
  countCodePoints,
} from "@/lib/utils/validation";

interface SourceTextFormProps {
  value: GenerationFormState;
  onChange: (next: GenerationFormState) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const ALLOWED_MODELS = [
  "openrouter/anthropic/claude-3.5-sonnet",
  "openrouter/openai/gpt-4o",
  "openrouter/openai/gpt-4o-mini",
  "openrouter/google/gemini-pro-1.5",
] as const;

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
    <Card>
      <CardHeader>
        <CardTitle>Tekst źródłowy</CardTitle>
        <CardDescription>
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
              "w-full px-3 py-2 rounded-md border bg-background text-foreground shadow-xs resize-y",
              "focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50",
              sourceTextError && "border-destructive"
            )}
          />
          <div className="flex justify-between items-center mt-2 text-sm">
            {sourceTextError ? (
              <p className="text-destructive">{sourceTextError}</p>
            ) : (
              <p className="text-muted-foreground">Wymagane: 1000-10000 znaków</p>
            )}
            <p className={cn("font-mono", currentLength >= 1000 && currentLength <= 10000 ? "text-green-600" : "text-muted-foreground")}>
              {currentLength} / 10000
            </p>
          </div>
        </div>

        {/* Max Flashcards */}
        <div>
          <label htmlFor="maxFlashcards" className="block text-sm font-medium mb-2">
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
            className="w-full h-9 px-3 rounded-md border bg-background text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button onClick={handleSubmitClick} disabled={!canSubmit} size="lg">
            {isSubmitting ? "Generowanie..." : "Generuj fiszki"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


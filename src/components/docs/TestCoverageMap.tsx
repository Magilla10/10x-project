import type { FC } from "react";

interface TestCoverageMapProps {
  className?: string;
}

const ASCII_MAP = `+ src/
  + lib/
    + utils/
      validation.ts
        └─> countCodePoints, validateSourceText, validateFlashcardFront/Back,
            validateTemperature, validateMaxFlashcards, mightExceedPayloadSize
            [TEST] tests/unit/lib/utils/validation.test.ts  ✓

    + services/
      flashcardsService.ts
        └─> createFlashcard → Supabase "flashcards"
              – błędy 23514 (limit), 23505 (duplikat)
            └─> mapRowToDto
            └─> updateFlashcard → Supabase "flashcards"
                  – pusta aktualizacja, duplikat, not found
            └─> deleteFlashcard → Supabase "flashcards"
                  – brak rekordu
            [TEST] tests/unit/lib/services/flashcardsService.test.ts  ✓

      aiGenerationsService.ts
        └─> createGeneration
              – assertNoPendingGeneration → Supabase "ai_generation_logs"
              – getUserFlashcardCount → Supabase "flashcards"
              – enqueueGenerationTask → Edge Function (fetch)
              – logGenerationError → Supabase "ai_generation_error_logs"
            [TEST] tests/unit/lib/services/aiGenerationsService.test.ts  ✓

    + hooks/
      useAiGeneration.ts
        ├─> postCreateGeneration / getGenerationDetail / postCommitGeneration (API client)
        ├─> mapApiStatusToUiStatus (viewModels/generationView)
        └─> validateFlashcardFront/Back (utils/validation)
            [TEST] tests/unit/lib/hooks/useAiGeneration.test.ts  ✓`;

export const TestCoverageMap: FC<TestCoverageMapProps> = ({ className }) => {
  return (
    <pre className={className}>
      <code>{ASCII_MAP}</code>
    </pre>
  );
};

export default TestCoverageMap;

import type { ValidationResult } from "../viewModels/generationView";

/**
 * Validation utilities for flashcard and generation forms
 */

/**
 * Count Unicode code points (not UTF-16 units)
 */
export function countCodePoints(text: string): number {
  return [...text].length;
}

/**
 * Validate source text length (1000-10000 code points)
 */
export function validateSourceText(text: string): ValidationResult {
  const length = countCodePoints(text.trim());

  if (length < 1000) {
    return {
      isValid: false,
      error: `Tekst musi mieć co najmniej 1000 znaków (obecnie: ${length})`,
    };
  }

  if (length > 10000) {
    return {
      isValid: false,
      error: `Tekst nie może przekraczać 10000 znaków (obecnie: ${length})`,
    };
  }

  return { isValid: true };
}

/**
 * Validate flashcard front (10-200 characters)
 */
export function validateFlashcardFront(text: string): ValidationResult {
  const length = countCodePoints(text.trim());

  if (length < 10) {
    return {
      isValid: false,
      error: `Przód fiszki musi mieć co najmniej 10 znaków (obecnie: ${length})`,
    };
  }

  if (length > 200) {
    return {
      isValid: false,
      error: `Przód fiszki nie może przekraczać 200 znaków (obecnie: ${length})`,
    };
  }

  return { isValid: true };
}

/**
 * Validate flashcard back (10-500 characters)
 */
export function validateFlashcardBack(text: string): ValidationResult {
  const length = countCodePoints(text.trim());

  if (length < 10) {
    return {
      isValid: false,
      error: `Tył fiszki musi mieć co najmniej 10 znaków (obecnie: ${length})`,
    };
  }

  if (length > 500) {
    return {
      isValid: false,
      error: `Tył fiszki nie może przekraczać 500 znaków (obecnie: ${length})`,
    };
  }

  return { isValid: true };
}

/**
 * Validate model selection
 */
export function validateModel(model: string | undefined, allowedModels: readonly string[]): ValidationResult {
  if (!model) {
    return { isValid: true }; // Optional field
  }

  if (!allowedModels.includes(model)) {
    return {
      isValid: false,
      error: `Model musi być jednym z dozwolonych: ${allowedModels.join(", ")}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate temperature (0.0-2.0, max 2 decimal places)
 */
export function validateTemperature(temperature: number | undefined): ValidationResult {
  if (temperature === undefined) {
    return { isValid: true }; // Optional field
  }

  if (temperature < 0.0 || temperature > 2.0) {
    return {
      isValid: false,
      error: "Temperature musi być w zakresie 0.0-2.0",
    };
  }

  const decimalPlaces = temperature.toString().split(".")[1]?.length || 0;
  if (decimalPlaces > 2) {
    return {
      isValid: false,
      error: "Temperature może mieć maksymalnie 2 miejsca po przecinku",
    };
  }

  return { isValid: true };
}

/**
 * Validate maxFlashcards (1-15)
 */
export function validateMaxFlashcards(maxFlashcards: number): ValidationResult {
  if (maxFlashcards < 1 || maxFlashcards > 15) {
    return {
      isValid: false,
      error: "Liczba fiszek musi być w zakresie 1-15",
    };
  }

  return { isValid: true };
}

/**
 * Estimate JSON payload size (heuristic for 413 prevention)
 * Returns true if size might exceed 10KB
 */
export function mightExceedPayloadSize(sourceText: string): boolean {
  // Rough estimate: JSON overhead + sourceText + metadata
  const estimatedSize = sourceText.length * 1.2 + 500; // 20% overhead + 500 bytes metadata
  return estimatedSize > 10 * 1024; // 10KB
}

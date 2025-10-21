import { z } from "zod";

/**
 * Allowed AI models whitelist - can be configured via environment variable
 * Default models for OpenRouter API
 */
const DEFAULT_ALLOWED_MODELS = [
  "openrouter/anthropic/claude-3.5-sonnet",
  "openrouter/openai/gpt-4o",
  "openrouter/openai/gpt-4o-mini",
  "openrouter/google/gemini-pro-1.5",
] as const;

/**
 * Get allowed models from environment or use defaults
 */
export function getAllowedModels(): readonly string[] {
  const envModels = import.meta.env.OPENROUTER_ALLOWED_MODELS;
  if (envModels && typeof envModels === "string") {
    return envModels.split(",").map((m) => m.trim());
  }
  return DEFAULT_ALLOWED_MODELS;
}

/**
 * Sanitize source text by:
 * - Trimming whitespace
 * - Removing control characters (except newlines, tabs, carriage returns)
 * - Normalizing whitespace
 */
function sanitizeSourceText(text: string): string {
  return (
    text
      .trim()
      // Remove control characters but keep newlines, tabs, and carriage returns
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "")
      // Normalize multiple spaces to single space
      .replace(/[^\S\r\n]+/g, " ")
      // Normalize multiple newlines to max 2
      .replace(/\n{3,}/g, "\n\n")
  );
}

/**
 * Count characters using Unicode code points instead of UTF-16 length.
 */
function countCodePoints(text: string): number {
  return [...text].length;
}

/**
 * Schema for validating POST /api/ai-generations request body
 * Enforces:
 * - Source text length between 1000-10000 characters after sanitization
 * - Max flashcards between 1-15
 * - Optional model from whitelist
 * - Optional temperature between 0.0-2.0 with max 2 decimal places
 */
export const createGenerationSchema = z
  .object({
    sourceText: z
      .string({
        required_error: "sourceText is required",
        invalid_type_error: "sourceText must be a string",
      })
      .transform((value, ctx) => {
        const sanitized = sanitizeSourceText(value);
        const length = countCodePoints(sanitized);

        if (length < 1000) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: 1000,
            inclusive: true,
            type: "string",
            message: "Source text must be at least 1000 characters after sanitization",
          });
        }

        if (length > 10000) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_big,
            maximum: 10000,
            inclusive: true,
            type: "string",
            message: "Source text must not exceed 10000 characters after sanitization",
          });
        }

        if (ctx.issues.length > 0) {
          return z.NEVER;
        }

        return sanitized;
      }),
    maxFlashcards: z
      .number({
        required_error: "maxFlashcards is required",
        invalid_type_error: "maxFlashcards must be a number",
      })
      .int("maxFlashcards must be an integer")
      .min(1, "maxFlashcards must be at least 1")
      .max(15, "maxFlashcards must not exceed 15"),
    model: z
      .string()
      .transform((value) => value.trim())
      .refine((val) => getAllowedModels().includes(val), {
        message: `Model must be one of the allowed models: ${getAllowedModels().join(", ")}`,
      })
      .optional(),
    temperature: z
      .number()
      .min(0.0, "Temperature must be at least 0.0")
      .max(2.0, "Temperature must not exceed 2.0")
      .refine(
        (val) => {
          const decimalPlaces = val.toString().split(".")[1]?.length || 0;
          return decimalPlaces <= 2;
        },
        {
          message: "Temperature must have at most 2 decimal places",
        }
      )
      .optional(),
  })
  .strict(); // Reject unknown properties

/**
 * Type inference for validated create generation command
 */
export type CreateGenerationInput = z.infer<typeof createGenerationSchema>;

/**
 * Validation helper for create generation command
 * Returns parsed data or throws ZodError with detailed issues
 */
export function validateCreateGenerationCommand(data: unknown): CreateGenerationInput {
  return createGenerationSchema.parse(data);
}

/**
 * Safe validation helper that returns success/error result
 */
export function safeValidateCreateGenerationCommand(data: unknown) {
  return createGenerationSchema.safeParse(data);
}


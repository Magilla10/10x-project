import { z } from "zod";

import type { FlashcardSource } from "../../types";

const MIN_TEXT_LENGTH = 10;
const FRONT_MAX_LENGTH = 200;
const BACK_MAX_LENGTH = 500;

function sanitizeText(value: string): string {
  return value
    .trim()
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/[ \t]{2,}/g, " ");
}

function countCodePoints(value: string): number {
  return [...value].length;
}

export const createFlashcardSchema = z
  .object({
    front: z
      .string({
        required_error: "front is required",
        invalid_type_error: "front must be a string",
      })
      .transform((value, ctx) => {
        const sanitized = sanitizeText(value);
        const length = countCodePoints(sanitized);
        if (length < MIN_TEXT_LENGTH) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: MIN_TEXT_LENGTH,
            inclusive: true,
            type: "string",
            message: "Front text must be at least 10 characters",
          });
        }
        if (length > FRONT_MAX_LENGTH) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_big,
            maximum: FRONT_MAX_LENGTH,
            inclusive: true,
            type: "string",
            message: "Front text must not exceed 200 characters",
          });
        }
        if (ctx.issues.length > 0) {
          return z.NEVER;
        }
        return sanitized;
      }),
    back: z
      .string({
        required_error: "back is required",
        invalid_type_error: "back must be a string",
      })
      .transform((value, ctx) => {
        const sanitized = sanitizeText(value);
        const length = countCodePoints(sanitized);
        if (length < MIN_TEXT_LENGTH) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            minimum: MIN_TEXT_LENGTH,
            inclusive: true,
            type: "string",
            message: "Back text must be at least 10 characters",
          });
        }
        if (length > BACK_MAX_LENGTH) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_big,
            maximum: BACK_MAX_LENGTH,
            inclusive: true,
            type: "string",
            message: "Back text must not exceed 500 characters",
          });
        }
        if (ctx.issues.length > 0) {
          return z.NEVER;
        }
        return sanitized;
      }),
    source: z.enum(["manual", "ai-full", "ai-edited"]).optional().default("manual"),
    originGenerationId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.source === "manual" && value.originGenerationId) {
      ctx.addIssue({
        path: ["originGenerationId"],
        code: z.ZodIssueCode.custom,
        message: "originGenerationId should not be provided for manual flashcards",
      });
    }
    if (value.source !== "manual" && !value.originGenerationId) {
      ctx.addIssue({
        path: ["originGenerationId"],
        code: z.ZodIssueCode.custom,
        message: "originGenerationId is required when source is AI-generated",
      });
    }
  });

export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;

export function validateCreateFlashcardCommand(data: unknown): CreateFlashcardInput {
  return createFlashcardSchema.parse(data);
}

export function safeValidateCreateFlashcardCommand(data: unknown) {
  return createFlashcardSchema.safeParse(data);
}

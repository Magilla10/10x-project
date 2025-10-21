import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types";
import type { ApiErrorResponse, CreateFlashcardCommand } from "../../types";
import { createFlashcard, FlashcardsServiceError } from "../../lib/services/flashcardsService";
import { validateCreateFlashcardCommand } from "../../lib/validators/flashcards";

export const prerender = false;

function errorResponse(status: number, code: string, message: string, details?: readonly unknown[]): Response {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function isJson(request: Request): boolean {
  return request.headers.get("content-type")?.includes("application/json") ?? false;
}

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) {
    return errorResponse(401, "UNAUTHORIZED", "Authentication required. Please log in.");
  }

  if (!isJson(request)) {
    return errorResponse(400, "INVALID_CONTENT_TYPE", "Content-Type must be application/json");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  let command: CreateFlashcardCommand;
  try {
    command = validateCreateFlashcardCommand(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));
      return errorResponse(422, "VALIDATION_ERROR", "Input validation failed", issues);
    }
    throw error;
  }

  try {
    const result = await createFlashcard(command, {
      supabase: locals.supabase,
      userId: locals.user.id,
    });

    return new Response(JSON.stringify({ flashcard: result }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof FlashcardsServiceError) {
      return errorResponse(error.statusCode, error.code, error.message, error.details ? [error.details] : undefined);
    }

    console.error("Unexpected error in POST /api/flashcards", error);
    return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred");
  }
};


import type { APIRoute } from "astro";
import { ZodError } from "zod";

import type { ApiErrorResponse, UpdateFlashcardCommand } from "../../../types";
import { deleteFlashcard, FlashcardsServiceError, updateFlashcard } from "../../../lib/services/flashcardsService";
import { validateUpdateFlashcardCommand } from "../../../lib/validators/flashcards";

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

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user) {
    return errorResponse(401, "UNAUTHORIZED", "Authentication required. Please log in.");
  }

  const id = params.id;
  if (!id) {
    return errorResponse(400, "INVALID_REQUEST", "Flashcard id is required");
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

  let command: UpdateFlashcardCommand;
  try {
    command = validateUpdateFlashcardCommand(payload);
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
    const flashcard = await updateFlashcard(id, command, {
      supabase: locals.supabase,
      userId: locals.user.id,
    });

    return new Response(JSON.stringify({ flashcard }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof FlashcardsServiceError) {
      return errorResponse(error.statusCode, error.code, error.message, error.details ? [error.details] : undefined);
    }

    console.error(`Unexpected error in PATCH /api/flashcards/${id}`, error);
    return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred");
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) {
    return errorResponse(401, "UNAUTHORIZED", "Authentication required. Please log in.");
  }

  const id = params.id;
  if (!id) {
    return errorResponse(400, "INVALID_REQUEST", "Flashcard id is required");
  }

  try {
    await deleteFlashcard(id, {
      supabase: locals.supabase,
      userId: locals.user.id,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof FlashcardsServiceError) {
      return errorResponse(error.statusCode, error.code, error.message, error.details ? [error.details] : undefined);
    }

    console.error(`Unexpected error in DELETE /api/flashcards/${id}`, error);
    return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred");
  }
};

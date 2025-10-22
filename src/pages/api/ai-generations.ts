import type { APIRoute } from "astro";
import { ZodError } from "zod";

import type { CreateGenerationCommand, ApiErrorResponse } from "../../types";
import { createGeneration, AiGenerationError, formatAiGenerationError } from "../../lib/services/aiGenerationsService";
import { validateCreateGenerationCommand } from "../../lib/validators/aiGenerations";

// Disable prerendering for this API endpoint
export const prerender = false;

/**
 * Helper to create JSON error response
 */
function errorResponse(statusCode: number, code: string, message: string, details?: readonly unknown[]): Response {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Helper to validate request Content-Type
 */
function validateContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type");
  return contentType?.includes("application/json") ?? false;
}

/**
 * Helper to parse and validate request payload size
 * Maximum 10 KB to prevent large payloads
 */
async function parseRequestBody(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  const MAX_PAYLOAD_SIZE = 10 * 1024; // 10 KB

  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }

  const text = await request.text();
  if (text.length > MAX_PAYLOAD_SIZE) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON");
  }
}

/**
 * POST /api/ai-generations
 *
 * Creates a new AI generation request for flashcard proposals.
 * Requires authentication via Supabase session.
 *
 * Request body:
 * - sourceText: string (1000-10000 chars after sanitization)
 * - maxFlashcards: number (1-15)
 * - model?: string (optional, must be in allowed list)
 * - temperature?: number (optional, 0.0-2.0 with max 2 decimal places)
 *
 * Returns:
 * - 202 Accepted: Generation created successfully
 * - 400 Bad Request: Invalid input
 * - 401 Unauthorized: Not authenticated
 * - 409 Conflict: Pending generation exists or flashcard limit reached
 * - 413 Payload Too Large: Request body exceeds 10 KB
 * - 422 Unprocessable Entity: Validation error
 * - 500 Internal Server Error: Server error
 */
export const POST: APIRoute = async ({ locals, request }) => {
  try {
    // 1. Authentication check
    if (!locals.user) {
      return errorResponse(401, "UNAUTHORIZED", "Authentication required. Please log in.");
    }

    // 2. Validate Content-Type
    if (!validateContentType(request)) {
      return errorResponse(400, "INVALID_CONTENT_TYPE", "Content-Type must be application/json");
    }

    // 3. Parse and validate payload size
    let rawBody: unknown;
    try {
      rawBody = await parseRequestBody(request);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "PAYLOAD_TOO_LARGE") {
          return errorResponse(413, "PAYLOAD_TOO_LARGE", "Request payload exceeds maximum size of 10 KB");
        }
        if (error.message === "INVALID_JSON") {
          return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
        }
      }
      throw error;
    }

    // 4. Validate request body with Zod schema
    let validatedCommand: CreateGenerationCommand;
    try {
      const validated = validateCreateGenerationCommand(rawBody);
      validatedCommand = {
        sourceText: validated.sourceText,
        maxFlashcards: validated.maxFlashcards,
        model: validated.model,
        temperature: validated.temperature,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        }));

        return errorResponse(
          422,
          "SCHEMA_VALIDATION_FAILED",
          "Input validation failed. Please check your request data.",
          issues
        );
      }
      throw error;
    }

    // 5. Call service to create generation
    const result = await createGeneration(validatedCommand, {
      supabase: locals.supabase,
      userId: locals.user.id,
    });

    // 6. Return 202 Accepted with generation metadata
    return new Response(JSON.stringify(result), {
      status: 202,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    // Handle known AiGenerationError
    if (error instanceof AiGenerationError) {
      return new Response(JSON.stringify(formatAiGenerationError(error)), {
        status: error.statusCode,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }

    // Handle unexpected errors
    console.error("Unexpected error in POST /api/ai-generations:", error);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred while processing your request. Please try again later."
    );
  }
};

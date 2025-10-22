import type { APIRoute } from "astro";
import type { GenerationDetailDto, ApiErrorResponse } from "../../../types";

// Disable prerendering for this API endpoint
export const prerender = false;

/**
 * Helper to create JSON error response
 */
function errorResponse(statusCode: number, code: string, message: string): Response {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
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
 * GET /api/ai-generations/:id
 *
 * Fetch generation details including proposed flashcards and status.
 * Used for polling during generation and viewing completed generations.
 *
 * Returns:
 * - 200 OK: Generation details
 * - 401 Unauthorized: Not authenticated
 * - 404 Not Found: Generation not found or not owned by user
 * - 500 Internal Server Error: Server error
 */
export const GET: APIRoute = async ({ locals, params }) => {
  try {
    // 1. Authentication check
    if (!locals.user) {
      return errorResponse(401, "UNAUTHORIZED", "Authentication required. Please log in.");
    }

    // 2. Extract generation ID
    const generationId = params.id;
    if (!generationId) {
      return errorResponse(400, "MISSING_ID", "Generation ID is required");
    }

    // 3. Fetch generation from database
    const { data, error } = await locals.supabase
      .from("ai_generation_logs")
      .select("*")
      .eq("id", generationId)
      .eq("user_id", locals.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse(404, "GENERATION_NOT_FOUND", "Generation not found or you don't have access to it");
      }
      throw error;
    }

    // 4. Build response DTO
    const proposedFlashcards = data.proposed_flashcards?.items || [];
    const maxFlashcards = data.proposed_flashcards?.maxFlashcards || 10;

    const expiresAt = new Date(new Date(data.created_at).getTime() + 5 * 60 * 1000).toISOString();

    const response: GenerationDetailDto = {
      id: data.id,
      status: data.status,
      sourceTextLength: data.source_text_length,
      maxFlashcards,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      expiresAt,
      model: data.model,
      temperature: data.temperature,
      durationMs: data.duration_ms,
      errorMessage: data.error_message,
      proposedFlashcards: proposedFlashcards.map(
        (item: { proposalId?: string; id?: string; front: string; back: string }) => ({
          proposalId: item.proposalId || item.id || "",
          front: item.front,
          back: item.back,
          source: "ai-full" as const,
        })
      ),
      metrics: {
        generatedCount: data.generated_count,
        acceptedCount: data.accepted_count,
        acceptedEditedCount: data.accepted_edited_count,
        acceptedUneditedCount: data.accepted_unedited_count,
        rejectedCount: data.rejected_count,
        durationMs: data.duration_ms,
      },
      sourceTextHash: data.source_text_hash,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/ai-generations/:id:", error);
    return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred while fetching generation details");
  }
};

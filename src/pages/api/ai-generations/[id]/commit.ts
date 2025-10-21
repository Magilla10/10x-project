import type { APIRoute } from "astro";
import { ZodError } from "zod";
import type { CommitGenerationCommand, CommitGenerationResultDto, ApiErrorResponse, FlashcardDto } from "../../../../types";
import { z } from "zod";

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
 * Validation schema for commit command
 */
const commitActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("accept"),
    proposalId: z.string(),
    front: z.string().min(10).max(200),
    back: z.string().min(10).max(500),
  }),
  z.object({
    action: z.literal("reject"),
    proposalId: z.string(),
    reason: z.string().optional(),
  }),
]);

const commitCommandSchema = z.object({
  flashcards: z.array(commitActionSchema),
});

/**
 * POST /api/ai-generations/:id/commit
 *
 * Commit selected flashcards from generation.
 * Accepts and rejects proposals, creating flashcard records for accepted ones.
 *
 * Request body:
 * - flashcards: array of accept/reject actions
 *
 * Returns:
 * - 200 OK: Flashcards committed successfully
 * - 401 Unauthorized: Not authenticated
 * - 404 Not Found: Generation not found
 * - 409 Conflict: Flashcard limit reached or duplicate
 * - 422 Unprocessable Entity: Validation error
 * - 500 Internal Server Error: Server error
 */
export const POST: APIRoute = async ({ locals, params, request }) => {
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

    // 3. Parse and validate request body
    let command: CommitGenerationCommand;
    try {
      const body = await request.json();
      const validated = commitCommandSchema.parse(body);
      command = { flashcards: validated.flashcards };
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));
        return errorResponse(422, "VALIDATION_ERROR", "Invalid commit command", issues);
      }
      return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
    }

    // 4. Fetch generation
    const { data: generation, error: fetchError } = await locals.supabase
      .from("ai_generation_logs")
      .select("*")
      .eq("id", generationId)
      .eq("user_id", locals.user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return errorResponse(404, "GENERATION_NOT_FOUND", "Generation not found");
      }
      throw fetchError;
    }

    // 5. Check flashcard limit
    const { count: currentCount } = await locals.supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("user_id", locals.user.id);

    const acceptedActions = command.flashcards.filter((f) => f.action === "accept");
    const remainingSlots = 15 - (currentCount || 0);

    if (acceptedActions.length > remainingSlots) {
      return errorResponse(
        409,
        "FLASHCARD_LIMIT_REACHED",
        `Cannot accept ${acceptedActions.length} flashcards. Only ${remainingSlots} slots available.`
      );
    }

    // 6. Create flashcard records for accepted proposals
    const acceptedFlashcards: FlashcardDto[] = [];
    let acceptedEditedCount = 0;
    let acceptedUneditedCount = 0;

    for (const action of acceptedActions) {
      if (action.action !== "accept") continue;

      // Find original proposal
      const proposedItems = generation.proposed_flashcards?.items || [];
      const originalProposal = proposedItems.find((p: any) => (p.proposalId || p.id) === action.proposalId);

      // Determine if edited
      const wasEdited = originalProposal
        ? action.front !== originalProposal.front || action.back !== originalProposal.back
        : false;

      const source = wasEdited ? "ai-edited" : "ai-full";

      if (wasEdited) {
        acceptedEditedCount++;
      } else {
        acceptedUneditedCount++;
      }

      // Insert flashcard
      const { data: flashcard, error: insertError } = await locals.supabase
        .from("flashcards")
        .insert({
          user_id: locals.user.id,
          front: action.front,
          back: action.back,
          source,
          origin_generation_id: generationId,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return errorResponse(409, "FLASHCARD_DUPLICATE", "Duplicate flashcard (front text already exists)");
        }
        throw insertError;
      }

      acceptedFlashcards.push({
        id: flashcard.id,
        front: flashcard.front,
        back: flashcard.back,
        source: flashcard.source,
        originGenerationId: flashcard.origin_generation_id,
        createdAt: flashcard.created_at,
        updatedAt: flashcard.updated_at,
      });
    }

    // 7. Update generation metrics
    const rejectedCount = command.flashcards.filter((f) => f.action === "reject").length;
    const proposedCount = generation.proposed_flashcards?.items?.length || 0;
    const skippedCount = proposedCount - acceptedActions.length - rejectedCount;

    await locals.supabase
      .from("ai_generation_logs")
      .update({
        accepted_count: acceptedActions.length,
        accepted_edited_count: acceptedEditedCount,
        accepted_unedited_count: acceptedUneditedCount,
        rejected_count: rejectedCount,
      })
      .eq("id", generationId)
      .eq("user_id", locals.user.id);

    // 8. Build response
    const response: CommitGenerationResultDto = {
      accepted: acceptedFlashcards,
      summary: {
        accepted: acceptedActions.length,
        acceptedEdited: acceptedEditedCount,
        acceptedUnedited: acceptedUneditedCount,
        rejected: rejectedCount,
        skipped: skippedCount,
      },
      metrics: {
        acceptedCount: acceptedActions.length,
        acceptedEditedCount,
        acceptedUneditedCount,
        rejectedCount,
        durationMs: generation.duration_ms,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/ai-generations/:id/commit:", error);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred while committing flashcards"
    );
  }
};


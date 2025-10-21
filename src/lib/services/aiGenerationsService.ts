import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateGenerationCommand, CreateGenerationResponseDto, GenerationSummaryDto } from "../../types";

/**
 * Service context required for AI generation operations
 */
interface ServiceContext {
  supabase: SupabaseClient;
  userId: string;
}

interface EnqueueGenerationPayload {
  generationId: string;
  userId: string;
  maxFlashcards: number;
  model: string;
  temperature: number;
  sourceTextHash: string;
}

const DEFAULT_QUEUE_URL = "https://functions.supabase.co/ai-generations/enqueue";

/**
 * Dispatch a background job to process the AI generation asynchronously.
 * Uses a fetch call to a Supabase Edge Function (or similar worker entrypoint).
 */
async function enqueueGenerationTask(payload: EnqueueGenerationPayload): Promise<void> {
  const queueUrl = import.meta.env.AI_GENERATIONS_QUEUE_URL ?? DEFAULT_QUEUE_URL;
  console.debug("[aiGenerations] enqueue request", {
    queueUrl,
    generationId: payload.generationId,
    userId: payload.userId,
  });

  const response = await fetch(queueUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.SUPABASE_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[aiGenerations] queue enqueue failed", {
      status: response.status,
      error: errorBody,
    });
    throw new Error(`Queue enqueue failed with status ${response.status}: ${errorBody}`);
  }
}

/**
 * Custom error types for AI generation service
 */
export class AiGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "AiGenerationError";
  }
}

/**
 * Generate SHA-256 hash of text using Web Crypto API
 */
async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Calculate accurate character length considering Unicode properly
 */
function calculateTextLength(text: string): number {
  return [...text].length;
}

/**
 * Check if user has an existing pending generation
 */
async function assertNoPendingGeneration(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("ai_generation_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new AiGenerationError("Failed to check for pending generations", "DB_CHECK_FAILED", 500, error);
  }

  if (data) {
    throw new AiGenerationError(
      "You already have a pending AI generation. Please wait for it to complete or cancel it before starting a new one.",
      "GENERATION_PENDING",
      409
    );
  }
}

/**
 * Get user's current flashcard count
 */
async function getUserFlashcardCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw new AiGenerationError("Failed to check flashcard count", "DB_CHECK_FAILED", 500, error);
  }

  return count || 0;
}

/**
 * Log error to ai_generation_error_logs table
 */
async function logGenerationError(
  supabase: SupabaseClient,
  userId: string,
  generationId: string | null,
  errorCode: string,
  errorMessage: string,
  model: string,
  sourceTextHash: string,
  sourceTextLength: number
): Promise<void> {
  const { error } = await supabase.from("ai_generation_error_logs").insert({
    user_id: userId,
    generation_id: generationId,
    error_code: errorCode,
    error_message: errorMessage,
    model: model,
    source_text_hash: sourceTextHash,
    source_text_length: sourceTextLength,
  });

  if (error) {
    // Log to console but don't throw - error logging is best-effort
    console.error("Failed to log generation error:", error);
  }
}

/**
 * Create a new AI generation request
 *
 * Validates business rules:
 * - No concurrent pending generation for user
 * - User must have space for new flashcards (< 15 existing)
 * - Source text is properly normalized and hashed
 *
 * Creates record in ai_generation_logs with status 'pending'
 * Returns generation metadata with computed expiration time
 *
 * @throws {AiGenerationError} with appropriate status code and error details
 */
export async function createGeneration(
  command: CreateGenerationCommand,
  context: ServiceContext
): Promise<CreateGenerationResponseDto> {
  const { supabase, userId } = context;
  const { sourceText, maxFlashcards, model, temperature } = command;
  const sourceTextLength = calculateTextLength(sourceText);
  const sourceTextHash = await generateHash(sourceText);

  try {
    // Business rule 1: Check for existing pending generation
    await assertNoPendingGeneration(supabase, userId);

    // Business rule 2: Validate flashcard limit
    const flashcardCount = await getUserFlashcardCount(supabase, userId);
    if (flashcardCount >= 15) {
      throw new AiGenerationError(
        "You have reached the maximum limit of 15 flashcards. Please delete some flashcards before generating new ones.",
        "FLASHCARD_LIMIT_REACHED",
        409
      );
    }

    // If user + maxFlashcards would exceed limit, warn but allow
    // (worker will handle partial acceptance)
    const wouldExceedLimit = flashcardCount + maxFlashcards > 15;
    if (wouldExceedLimit) {
      console.warn("[aiGenerations] requested flashcards exceed available slots", {
        userId,
        requested: maxFlashcards,
        remainingSlots: 15 - flashcardCount,
      });
    }

    // Prepare default values for model and temperature
    const finalModel = model || "openrouter/anthropic/claude-3.5-sonnet";
    const finalTemperature = temperature !== undefined ? temperature : 1.0;

    // Create generation record
    const { data, error } = await supabase
      .from("ai_generation_logs")
      .insert({
        user_id: userId,
        status: "pending",
        source_text: sourceText,
        source_text_hash: sourceTextHash,
        source_text_length: sourceTextLength,
        proposed_flashcards: {
          maxFlashcards,
          items: [],
        },
        generated_count: 0,
        accepted_count: 0,
        accepted_unedited_count: 0,
        accepted_edited_count: 0,
        rejected_count: 0,
        model: finalModel,
        temperature: finalTemperature,
        duration_ms: null,
        error_message: null,
      })
      .select("id, status, source_text_length, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new AiGenerationError(
          "You already have a pending AI generation. Please wait for it to complete or cancel it before starting a new one.",
          "GENERATION_PENDING",
          409,
          error
        );
      }

      throw new AiGenerationError("Failed to create generation record", "DB_WRITE_FAILED", 500, error);
    }

    // Calculate expiration time (5 minutes from creation)
    const expiresAt = new Date(new Date(data.created_at).getTime() + 5 * 60 * 1000).toISOString();

    try {
      await enqueueGenerationTask({
        generationId: data.id,
        userId,
        maxFlashcards,
        model: finalModel,
        temperature: finalTemperature,
        sourceTextHash,
      });
    } catch (enqueueError) {
      const errorMessage = "Failed to enqueue AI generation for background processing";

      const { error: updateError } = await supabase
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", data.id)
        .eq("user_id", userId)
        .select("id")
        .single();

      if (updateError) {
        console.error("Failed to update generation status after enqueue failure", updateError);
      }

      await logGenerationError(
        supabase,
        userId,
        data.id,
        "QUEUE_ENQUEUE_FAILED",
        errorMessage,
        finalModel,
        sourceTextHash,
        sourceTextLength
      );

      throw new AiGenerationError(errorMessage, "QUEUE_ENQUEUE_FAILED", 500, enqueueError);
    }

    // Build response DTO
    const generationSummary: GenerationSummaryDto = {
      id: data.id,
      status: data.status,
      sourceTextLength: data.source_text_length,
      maxFlashcards,
      createdAt: data.created_at,
      expiresAt,
    };

    console.info("[aiGenerations] generation created", {
      generationId: data.id,
      userId,
      status: data.status,
    });

    return {
      generation: generationSummary,
    };
  } catch (error) {
    // Re-throw AiGenerationError as-is
    if (error instanceof AiGenerationError) {
      if (error.statusCode >= 500) {
        await logGenerationError(
          supabase,
          userId,
          null,
          error.code,
          error.message,
          model || "openrouter/anthropic/claude-3.5-sonnet",
          sourceTextHash,
          sourceTextLength
        );
      }
      throw error;
    }

    // Wrap unexpected errors
    console.error("[aiGenerations] unexpected error in createGeneration", error);
    const unexpectedError = new AiGenerationError(
      "An unexpected error occurred while creating the generation",
      "INTERNAL_ERROR",
      500,
      error
    );

    await logGenerationError(
      supabase,
      userId,
      null,
      unexpectedError.code,
      unexpectedError.message,
      model || "openrouter/anthropic/claude-3.5-sonnet",
      sourceTextHash,
      sourceTextLength
    );

    throw unexpectedError;
  }
}

/**
 * Helper to convert AiGenerationError to API error response
 */
export function formatAiGenerationError(error: AiGenerationError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: [error.details] }),
    },
  };
}

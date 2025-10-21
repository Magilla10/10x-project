import type { SupabaseClient } from "../../db/supabase.client";
import type {
  CreateFlashcardCommand,
  CreateFlashcardResponseDto,
  FlashcardDto,
} from "../../types";

interface ServiceContext {
  supabase: SupabaseClient;
  userId: string;
}

export class FlashcardsServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "FlashcardsServiceError";
  }
}

function mapRowToDto(row: {
  id: string;
  front: string;
  back: string;
  source: string;
  origin_generation_id: string | null;
  created_at: string;
  updated_at: string;
}): FlashcardDto {
  return {
    id: row.id,
    front: row.front,
    back: row.back,
    source: row.source,
    originGenerationId: row.origin_generation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createFlashcard(
  command: CreateFlashcardCommand,
  context: ServiceContext
): Promise<CreateFlashcardResponseDto> {
  const { supabase, userId } = context;
  const { front, back, source = "manual", originGenerationId } = command;

  const { data, error } = await supabase
    .from("flashcards")
    .insert({
      user_id: userId,
      front,
      back,
      source,
      origin_generation_id: originGenerationId ?? null,
    })
    .select("id, front, back, source, origin_generation_id, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23514") {
      throw new FlashcardsServiceError(
        "You have reached the maximum of 15 flashcards. Delete an existing card before adding a new one.",
        "FLASHCARD_LIMIT_REACHED",
        409
      );
    }

    if (error.code === "23505") {
      throw new FlashcardsServiceError(
        "A flashcard with the same front already exists.",
        "FLASHCARD_DUPLICATE",
        409
      );
    }

    throw new FlashcardsServiceError("Failed to create flashcard", "DB_WRITE_FAILED", 500, error);
  }

  return mapRowToDto(data);
}


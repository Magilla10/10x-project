import type { SupabaseClient } from "../../db/supabase.client";
import type {
  CreateFlashcardCommand,
  CreateFlashcardResponseDto,
  FlashcardDto,
  UpdateFlashcardCommand,
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
      throw new FlashcardsServiceError("A flashcard with the same front already exists.", "FLASHCARD_DUPLICATE", 409);
    }

    throw new FlashcardsServiceError("Failed to create flashcard", "DB_WRITE_FAILED", 500, error);
  }

  return mapRowToDto(data);
}

export async function listFlashcards(context: ServiceContext): Promise<FlashcardDto[]> {
  const { supabase, userId } = context;

  const { data, error } = await supabase
    .from("flashcards")
    .select("id, front, back, source, origin_generation_id, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new FlashcardsServiceError("Failed to load flashcards", "DB_READ_FAILED", 500, error);
  }

  return (data ?? []).map(mapRowToDto);
}

export async function updateFlashcard(
  id: string,
  command: UpdateFlashcardCommand,
  context: ServiceContext
): Promise<FlashcardDto> {
  const { supabase, userId } = context;

  const updates: Record<string, unknown> = {};

  if (command.front !== undefined) {
    updates.front = command.front;
  }

  if (command.back !== undefined) {
    updates.back = command.back;
  }

  if (command.source !== undefined) {
    updates.source = command.source;
  }

  if (command.originGenerationId !== undefined) {
    updates.origin_generation_id = command.originGenerationId;
  }

  if (Object.keys(updates).length === 0) {
    throw new FlashcardsServiceError(
      "At least one field must be provided to update a flashcard",
      "FLASHCARD_UPDATE_EMPTY",
      400
    );
  }

  const { data, error } = await supabase
    .from("flashcards")
    .update(updates)
    .eq("user_id", userId)
    .eq("id", id)
    .select("id, front, back, source, origin_generation_id, created_at, updated_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new FlashcardsServiceError("A flashcard with the same front already exists.", "FLASHCARD_DUPLICATE", 409);
    }

    throw new FlashcardsServiceError("Failed to update flashcard", "DB_WRITE_FAILED", 500, error);
  }

  if (!data) {
    throw new FlashcardsServiceError("Flashcard not found", "FLASHCARD_NOT_FOUND", 404);
  }

  return mapRowToDto(data);
}

export async function deleteFlashcard(id: string, context: ServiceContext): Promise<void> {
  const { supabase, userId } = context;

  const { data, error } = await supabase
    .from("flashcards")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)
    .select("id");

  if (error) {
    throw new FlashcardsServiceError("Failed to delete flashcard", "DB_WRITE_FAILED", 500, error);
  }

  if (!data || data.length === 0) {
    throw new FlashcardsServiceError("Flashcard not found", "FLASHCARD_NOT_FOUND", 404);
  }
}

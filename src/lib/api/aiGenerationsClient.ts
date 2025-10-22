import type {
  CreateGenerationCommand,
  CreateGenerationResponseDto,
  GenerationDetailDto,
  CommitGenerationCommand,
  CommitGenerationResultDto,
  CreateFlashcardCommand,
  CreateFlashcardResponseDto,
  FlashcardDto,
  UpdateFlashcardCommand,
  ApiErrorResponse,
} from "../../types";

/**
 * HTTP client for AI Generations API endpoints
 */

/**
 * POST /api/ai-generations
 * Create a new AI generation request
 */
export async function postCreateGeneration(payload: CreateGenerationCommand): Promise<CreateGenerationResponseDto> {
  const response = await fetch("/api/ai-generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    credentials: "same-origin",
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiErrorResponse;
    throw new ApiError(response.status, errorData.error.code, errorData.error.message, errorData.error.details);
  }

  return response.json();
}

/**
 * GET /api/ai-generations/:id
 * Fetch generation details including proposed flashcards
 */
export async function getGenerationDetail(id: string): Promise<GenerationDetailDto> {
  const response = await fetch(`/api/ai-generations/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiErrorResponse;
    throw new ApiError(response.status, errorData.error.code, errorData.error.message, errorData.error.details);
  }

  return response.json();
}

/**
 * POST /api/ai-generations/:id/commit
 * Commit selected flashcards (accept/reject actions)
 */
export async function postCommitGeneration(
  id: string,
  command: CommitGenerationCommand
): Promise<CommitGenerationResultDto> {
  const response = await fetch(`/api/ai-generations/${id}/commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    credentials: "same-origin",
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiErrorResponse;
    throw new ApiError(response.status, errorData.error.code, errorData.error.message, errorData.error.details);
  }

  return response.json();
}

/**
 * POST /api/flashcards
 * Create a single manual flashcard
 */
export async function postCreateManualFlashcard(
  command: CreateFlashcardCommand
): Promise<{ flashcard: CreateFlashcardResponseDto }> {
  const response = await fetch("/api/flashcards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    credentials: "same-origin",
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiErrorResponse;
    throw new ApiError(response.status, errorData.error.code, errorData.error.message, errorData.error.details);
  }

  return response.json();
}

/**
 * GET /api/flashcards
 * List flashcards for current user
 */
export async function getFlashcards(): Promise<{ flashcards: FlashcardDto[] }> {
  const response = await fetch("/api/flashcards", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiErrorResponse;
    throw new ApiError(response.status, errorData.error.code, errorData.error.message, errorData.error.details);
  }

  return response.json();
}

/**
 * PATCH /api/flashcards/:id
 * Update flashcard
 */
export async function patchFlashcard(
  id: string,
  command: UpdateFlashcardCommand
): Promise<{ flashcard: FlashcardDto }> {
  const response = await fetch(`/api/flashcards/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    credentials: "same-origin",
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiErrorResponse;
    throw new ApiError(response.status, errorData.error.code, errorData.error.message, errorData.error.details);
  }

  return response.json();
}

/**
 * DELETE /api/flashcards/:id
 * Delete flashcard
 */
export async function deleteFlashcardRequest(id: string): Promise<void> {
  const response = await fetch(`/api/flashcards/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiErrorResponse;
    throw new ApiError(response.status, errorData.error.code, errorData.error.message, errorData.error.details);
  }
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: readonly unknown[]
  ) {
    super(message);
    this.name = "ApiError";
  }
}

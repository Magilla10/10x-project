import type { Database } from "./db/database.types";

// ------------------------------------------------------------------------------------------------
// Base entity aliases derived from Supabase schema definitions
// ------------------------------------------------------------------------------------------------
type ProfileRow = Database["app"]["Tables"]["profiles"]["Row"];
type FlashcardRow = Database["app"]["Tables"]["flashcards"]["Row"];
type FlashcardUpdateRow = Database["app"]["Tables"]["flashcards"]["Update"];
type GenerationRow = Database["app"]["Tables"]["ai_generation_logs"]["Row"];
type GenerationErrorLogRow = Database["app"]["Tables"]["ai_generation_error_logs"]["Row"];

export type FlashcardSource = Database["app"]["Enums"]["flashcard_source"];
export type AiGenerationStatus = Database["app"]["Enums"]["ai_generation_status"];

// ------------------------------------------------------------------------------------------------
// Shared utility DTOs
// ------------------------------------------------------------------------------------------------
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: readonly unknown[];
  };
}

// ------------------------------------------------------------------------------------------------
// Profile DTOs & Commands
// ------------------------------------------------------------------------------------------------
export interface ProfileDto {
  userId: ProfileRow["user_id"];
  email: string; // Sourced from Supabase Auth `users.email`, not stored in app.profiles
  displayName: ProfileRow["display_name"];
  timeZone: ProfileRow["time_zone"];
  marketingOptIn: ProfileRow["marketing_opt_in"];
  createdAt: ProfileRow["created_at"];
  updatedAt: ProfileRow["updated_at"];
}

export interface MeResponseDto {
  profile: ProfileDto;
}

export interface UpdateProfileCommand {
  displayName?: ProfileRow["display_name"];
  timeZone?: ProfileRow["time_zone"];
  marketingOptIn?: ProfileRow["marketing_opt_in"];
}

export interface DeleteAccountCommand {
  confirmation: "delete-my-account";
}

// ------------------------------------------------------------------------------------------------
// Flashcard DTOs & Commands
// ------------------------------------------------------------------------------------------------
export interface FlashcardDto {
  id: FlashcardRow["id"];
  front: FlashcardRow["front"];
  back: FlashcardRow["back"];
  source: FlashcardRow["source"];
  originGenerationId: FlashcardRow["origin_generation_id"];
  createdAt: FlashcardRow["created_at"];
  updatedAt: FlashcardRow["updated_at"];
}

export interface FlashcardsListResponseDto {
  data: readonly FlashcardDto[];
  pagination: PaginationMeta;
}

export type CreateFlashcardResponseDto = FlashcardDto;

export interface CreateFlashcardCommand {
  front: FlashcardRow["front"];
  back: FlashcardRow["back"];
  source?: FlashcardRow["source"];
  originGenerationId?: FlashcardRow["origin_generation_id"];
}

export type FlashcardUpdateDto = Partial<{
  front: FlashcardUpdateRow["front"];
  back: FlashcardUpdateRow["back"];
  source: FlashcardUpdateRow["source"];
  originGenerationId: FlashcardUpdateRow["origin_generation_id"];
}>;

export type UpdateFlashcardCommand = FlashcardUpdateDto;

// ------------------------------------------------------------------------------------------------
// AI Generation DTOs & Commands
// ------------------------------------------------------------------------------------------------
export interface CreateGenerationCommand {
  sourceText: GenerationRow["source_text"];
  model?: GenerationRow["model"];
  temperature?: GenerationRow["temperature"];
  maxFlashcards: number;
}

export interface CreateGenerationResponseDto {
  generation: GenerationSummaryDto;
}

export interface GenerationSummaryDto {
  id: GenerationRow["id"];
  status: GenerationRow["status"];
  sourceTextLength: GenerationRow["source_text_length"];
  maxFlashcards: number;
  createdAt: GenerationRow["created_at"];
  expiresAt: string; // Computed expiration timestamp handled by service layer
}

export interface AiGenerationMetricsDto {
  generatedCount: GenerationRow["generated_count"];
  acceptedCount: GenerationRow["accepted_count"];
  acceptedEditedCount: GenerationRow["accepted_edited_count"];
  acceptedUneditedCount: GenerationRow["accepted_unedited_count"];
  rejectedCount: GenerationRow["rejected_count"];
  durationMs: GenerationRow["duration_ms"];
}

export interface GenerationListItemDto extends GenerationSummaryDto {
  updatedAt: GenerationRow["updated_at"];
  model: GenerationRow["model"];
  temperature: GenerationRow["temperature"];
  metrics: AiGenerationMetricsDto;
  errorMessage: GenerationRow["error_message"];
}

export interface GenerationListResponseDto {
  data: readonly GenerationListItemDto[];
  pagination: PaginationMeta;
}

export interface ProposedFlashcardDto {
  proposalId: string;
  front: FlashcardRow["front"];
  back: FlashcardRow["back"];
  source?: Extract<FlashcardSource, "ai-full" | "ai-edited">;
  metadata?: Record<string, unknown>;
}

export interface GenerationDetailDto extends GenerationSummaryDto {
  updatedAt: GenerationRow["updated_at"];
  model: GenerationRow["model"];
  temperature: GenerationRow["temperature"];
  durationMs: GenerationRow["duration_ms"];
  errorMessage: GenerationRow["error_message"];
  proposedFlashcards: readonly ProposedFlashcardDto[];
  metrics: AiGenerationMetricsDto;
  sourceTextHash: GenerationRow["source_text_hash"];
}

export type GenerationCommitAction =
  | {
      action: "accept";
      proposalId: string;
      front: FlashcardRow["front"];
      back: FlashcardRow["back"];
    }
  | {
      action: "reject";
      proposalId: string;
      reason?: string;
    };

export interface CommitGenerationCommand {
  flashcards: readonly GenerationCommitAction[];
}

export interface CommitGenerationSummaryDto {
  accepted: GenerationRow["accepted_count"];
  acceptedEdited: GenerationRow["accepted_edited_count"];
  acceptedUnedited: GenerationRow["accepted_unedited_count"];
  rejected: GenerationRow["rejected_count"];
  skipped: number;
}

export interface CommitGenerationResultDto {
  accepted: readonly FlashcardDto[];
  summary: CommitGenerationSummaryDto;
  metrics: Omit<AiGenerationMetricsDto, "generatedCount">;
}

export interface RetryGenerationCommand {
  model?: GenerationRow["model"];
  temperature?: GenerationRow["temperature"];
}

// ------------------------------------------------------------------------------------------------
// Generation Error Log DTOs
// ------------------------------------------------------------------------------------------------
export interface AiGenerationErrorLogDto {
  id: GenerationErrorLogRow["id"];
  userId: GenerationErrorLogRow["user_id"];
  generationId: GenerationErrorLogRow["generation_id"];
  errorCode: GenerationErrorLogRow["error_code"];
  errorMessage: GenerationErrorLogRow["error_message"];
  model: GenerationErrorLogRow["model"];
  sourceTextHash: GenerationErrorLogRow["source_text_hash"];
  sourceTextLength: GenerationErrorLogRow["source_text_length"];
  createdAt: GenerationErrorLogRow["created_at"];
  updatedAt: GenerationErrorLogRow["updated_at"];
}

export interface AiGenerationErrorLogListResponseDto {
  data: readonly AiGenerationErrorLogDto[];
  pagination: PaginationMeta;
}

// ------------------------------------------------------------------------------------------------
// Study Session DTOs & Commands (virtual resource backed by flashcard data)
// ------------------------------------------------------------------------------------------------
export type StudySessionRating = "again" | "hard" | "good" | "easy";

export interface StudySessionCardDto {
  flashcardId: FlashcardRow["id"];
  front: FlashcardRow["front"];
  source: FlashcardRow["source"];
  originGenerationId: FlashcardRow["origin_generation_id"];
}

export interface StudySessionActiveCardDto {
  flashcardId: FlashcardRow["id"];
  front: FlashcardRow["front"];
  source: FlashcardRow["source"];
  originGenerationId: FlashcardRow["origin_generation_id"];
  revealed: boolean;
  back?: FlashcardRow["back"];
}

export interface CreateStudySessionCommand {
  maxCards: number;
  includeSources?: readonly FlashcardSource[];
}

export interface StudySessionDto {
  sessionId: string;
  createdAt: string;
  totalCards: number;
  queue: readonly StudySessionCardDto[];
}

export interface StudySessionStateDto extends StudySessionDto {
  remainingCards: number;
  reviewedCount: number;
  activeCard?: StudySessionActiveCardDto;
}

export interface SubmitStudySessionReviewCommand {
  flashcardId: FlashcardRow["id"];
  rating: StudySessionRating;
  revealed: boolean;
}

export interface StudySessionReviewResultDto {
  sessionId: string;
  reviewedCount: number;
  remainingCards: number;
  lastReview: {
    flashcardId: FlashcardRow["id"];
    rating: StudySessionRating;
    reviewedAt: string;
  };
  nextCard?: StudySessionActiveCardDto;
}

// ------------------------------------------------------------------------------------------------
// AI Metrics DTOs
// ------------------------------------------------------------------------------------------------
export interface AiMetricsWindowDto {
  from: string;
  to: string;
}

export interface AiMetricsSummaryDto {
  acceptanceRate: number;
  aiUsageRate: number;
  averageDurationMs: number;
  totalGenerations: number;
  totalAccepted: GenerationRow["accepted_count"];
  totalRejected: GenerationRow["rejected_count"];
}

export interface AiMetricsBreakdownItemDto extends AiMetricsSummaryDto {
  key: string;
  model?: GenerationRow["model"];
}

export interface AiMetricsResponseDto {
  window: AiMetricsWindowDto;
  metrics: AiMetricsSummaryDto;
  breakdown: readonly AiMetricsBreakdownItemDto[];
}

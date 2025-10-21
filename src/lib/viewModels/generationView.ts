import type { AiGenerationStatus } from "../../types";

/**
 * View Model types for AI Generation View
 * These types extend the base DTOs with UI-specific state and behavior
 */

/**
 * Extended status for UI flow
 * Maps API statuses and adds UI-specific states
 */
export type GenerationStatus = 
  | "idle"           // Initial state, no generation started
  | "submitting"     // Form is being submitted
  | "pending"        // Generation is processing (API: pending)
  | "ready"          // Generation completed successfully (API: succeeded)
  | "failed"         // Generation failed (API: failed)
  | "committing"     // Committing selected flashcards
  | "committed";     // Successfully committed

/**
 * Maps API status to UI status
 */
export function mapApiStatusToUiStatus(apiStatus: AiGenerationStatus): GenerationStatus {
  switch (apiStatus) {
    case "pending":
      return "pending";
    case "succeeded":
      return "ready";
    case "failed":
      return "failed";
    default:
      return "idle";
  }
}

/**
 * UI-friendly error structure
 */
export interface UiError {
  code: string;
  message: string;
  details?: readonly unknown[];
}

/**
 * Form state for generation input
 */
export interface GenerationFormState {
  sourceText: string;
  model?: string;
  temperature?: number;
  maxFlashcards: number;
}

/**
 * Progress tracking for visual feedback
 */
export interface GenerationProgressState {
  startedAt?: number;    // timestamp in ms
  deadlineAt?: number;   // startedAt + 5000ms
}

/**
 * Editable proposal with draft state
 * Extends ProposedFlashcardDto with UI editing capabilities
 */
export interface EditableProposedFlashcard {
  proposalId: string;
  frontOriginal: string;
  backOriginal: string;
  frontDraft: string;
  backDraft: string;
  accepted: boolean;
  edited: boolean;  // Derived: true if draft differs from original
  validation?: {
    front?: string;
    back?: string;
  };
}

/**
 * Commit selection state and constraints
 */
export interface CommitSelectionState {
  selectedCount: number;
  remainingSlots: number;  // 15 - currentUserFlashcards
}

/**
 * Validation result for form fields
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Complete view state for GenerateView component
 */
export interface GenerateViewState {
  status: GenerationStatus;
  form: GenerationFormState;
  progress: GenerationProgressState;
  error?: UiError;
  generationId?: string;
  proposals: EditableProposedFlashcard[];
  selection: CommitSelectionState;
}


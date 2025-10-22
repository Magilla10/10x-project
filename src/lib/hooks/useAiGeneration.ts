import { useState, useCallback, useRef } from "react";
import type {
  GenerationStatus,
  GenerationFormState,
  GenerationProgressState,
  UiError,
  EditableProposedFlashcard,
  CommitSelectionState,
} from "../viewModels/generationView";
import { mapApiStatusToUiStatus } from "../viewModels/generationView";
import type { ProposedFlashcardDto, GenerationCommitAction } from "../../types";
import { postCreateGeneration, getGenerationDetail, postCommitGeneration, ApiError } from "../api/aiGenerationsClient";
import { validateFlashcardFront, validateFlashcardBack } from "../utils/validation";

const POLLING_INTERVAL = 800; // ms
const POLLING_TIMEOUT = 5000; // 5 seconds

/**
 * Custom hook for managing AI generation lifecycle
 * Handles: start → polling → proposals → commit
 */
export function useAiGeneration() {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState<GenerationProgressState>({});
  const [error, setError] = useState<UiError>();
  const [generationId, setGenerationId] = useState<string>();
  const [proposals, setProposals] = useState<EditableProposedFlashcard[]>([]);
  const [selection, setSelection] = useState<CommitSelectionState>({
    selectedCount: 0,
    remainingSlots: 15, // TODO: fetch from API
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout>();

  /**
   * Convert API proposals to editable view models
   */
  const mapProposalsToEditable = useCallback(
    (apiProposals: readonly ProposedFlashcardDto[]): EditableProposedFlashcard[] => {
      return apiProposals.map((p) => ({
        proposalId: p.proposalId,
        frontOriginal: p.front,
        backOriginal: p.back,
        frontDraft: p.front,
        backDraft: p.back,
        accepted: false,
        edited: false,
      }));
    },
    []
  );

  /**
   * Start polling for generation result
   */
  const startPolling = useCallback(
    (id: string) => {
      const startedAt = Date.now();
      const deadlineAt = startedAt + POLLING_TIMEOUT;

      setProgress({ startedAt, deadlineAt });

      pollingIntervalRef.current = setInterval(async () => {
        if (Date.now() > deadlineAt) {
          clearInterval(pollingIntervalRef.current);
          setStatus("failed");
          setError({
            code: "POLLING_TIMEOUT",
            message: "Generowanie trwa zbyt długo. Spróbuj ponownie później.",
          });
          return;
        }

        try {
          const detail = await getGenerationDetail(id);
          const uiStatus = mapApiStatusToUiStatus(detail.status);

          if (uiStatus === "ready") {
            clearInterval(pollingIntervalRef.current);
            setStatus("ready");
            setProposals(mapProposalsToEditable(detail.proposedFlashcards));
            setSelection((prev) => ({ ...prev, selectedCount: 0 }));
          } else if (uiStatus === "failed") {
            clearInterval(pollingIntervalRef.current);
            setStatus("failed");
            setError({
              code: "GENERATION_FAILED",
              message: detail.errorMessage || "Generowanie nie powiodło się",
            });
          }
          // else still pending, keep polling
        } catch (err) {
          clearInterval(pollingIntervalRef.current);
          setStatus("failed");
          if (err instanceof ApiError) {
            setError({
              code: err.code,
              message: err.message,
              details: err.details,
            });
          } else {
            setError({
              code: "UNKNOWN_ERROR",
              message: "Wystąpił nieoczekiwany błąd",
            });
          }
        }
      }, POLLING_INTERVAL);
    },
    [mapProposalsToEditable]
  );

  /**
   * Start generation
   */
  const startGeneration = useCallback(
    async (form: GenerationFormState) => {
      setStatus("submitting");
      setError(undefined);
      setProposals([]);

      try {
        const response = await postCreateGeneration({
          sourceText: form.sourceText,
          maxFlashcards: form.maxFlashcards,
          model: form.model,
          temperature: form.temperature,
        });

        setGenerationId(response.generation.id);
        setStatus("pending");
        startPolling(response.generation.id);
      } catch (err) {
        setStatus("failed");
        if (err instanceof ApiError) {
          setError({
            code: err.code,
            message: err.message,
            details: err.details,
          });
        } else {
          setError({
            code: "UNKNOWN_ERROR",
            message: "Nie udało się rozpocząć generowania",
          });
        }
      }
    },
    [startPolling]
  );

  /**
   * Toggle proposal acceptance
   */
  const toggleAccept = useCallback((proposalId: string) => {
    setProposals((prev) => {
      const updated = prev.map((p) => (p.proposalId === proposalId ? { ...p, accepted: !p.accepted } : p));
      const acceptedCount = updated.filter((p) => p.accepted).length;
      setSelection((s) => ({ ...s, selectedCount: acceptedCount }));
      return updated;
    });
  }, []);

  /**
   * Edit proposal
   */
  const editProposal = useCallback((proposalId: string, front: string, back: string) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.proposalId !== proposalId) return p;

        const edited = front !== p.frontOriginal || back !== p.backOriginal;
        const frontValidation = validateFlashcardFront(front);
        const backValidation = validateFlashcardBack(back);

        return {
          ...p,
          frontDraft: front,
          backDraft: back,
          edited,
          validation: {
            front: frontValidation.isValid ? undefined : frontValidation.error,
            back: backValidation.isValid ? undefined : backValidation.error,
          },
        };
      })
    );
  }, []);

  /**
   * Commit selected proposals
   */
  const commitSelected = useCallback(async () => {
    if (!generationId) return;

    setStatus("committing");
    setError(undefined);

    try {
      const accepted = proposals.filter((p) => p.accepted);
      const flashcards: GenerationCommitAction[] = accepted.map((p) => ({
        action: "accept" as const,
        proposalId: p.proposalId,
        front: p.frontDraft,
        back: p.backDraft,
      }));

      await postCommitGeneration(generationId, { flashcards });
      setStatus("committed");
      setProposals([]);
      setSelection({ selectedCount: 0, remainingSlots: 15 }); // TODO: update from response
    } catch (err) {
      setStatus("ready"); // Back to proposals
      if (err instanceof ApiError) {
        setError({
          code: err.code,
          message: err.message,
          details: err.details,
        });
      } else {
        setError({
          code: "COMMIT_FAILED",
          message: "Nie udało się zapisać fiszek",
        });
      }
    }
  }, [generationId, proposals]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setStatus("idle");
    setProgress({});
    setError(undefined);
    setGenerationId(undefined);
    setProposals([]);
    setSelection({ selectedCount: 0, remainingSlots: 15 });
  }, []);

  return {
    status,
    progress,
    error,
    generationId,
    proposals,
    selection,
    startGeneration,
    toggleAccept,
    editProposal,
    commitSelected,
    reset,
  };
}

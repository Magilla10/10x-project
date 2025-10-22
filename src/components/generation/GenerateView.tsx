import { useState } from "react";
import type { GenerationFormState } from "@/lib/viewModels/generationView";
import { SourceTextForm } from "./SourceTextForm";
import { GenerationStatusPanel } from "./GenerationStatusPanel";
import { ProposalsSection } from "./ProposalsSection";
import { ManualFlashcardForm } from "./ManualFlashcardForm";
import { useAiGeneration } from "@/lib/hooks/useAiGeneration";

/**
 * Main view component for AI flashcard generation
 * Orchestrates the full flow: input → generation → proposals → commit
 */
export default function GenerateView() {
  const {
    status,
    progress,
    error,
    proposals,
    selection,
    startGeneration,
    toggleAccept,
    editProposal,
    commitSelected,
    reset,
  } = useAiGeneration();

  const [formState, setFormState] = useState<GenerationFormState>({
    sourceText: "",
    model: undefined,
    temperature: undefined,
    maxFlashcards: 10,
  });

  const handleFormChange = (next: GenerationFormState) => {
    setFormState(next);
  };

  const handleSubmit = async () => {
    await startGeneration(formState);
  };

  const handleProposalChange = (proposalId: string, front: string, back: string) => {
    editProposal(proposalId, front, back);
  };

  const handleCommit = async () => {
    await commitSelected();
  };

  const isFormDisabled = status === "submitting" || status === "pending" || status === "committing";
  const showProposals = status === "ready" && proposals.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Generowanie fiszek AI</h1>
          <p className="text-muted-foreground">
            Wklej tekst (1000-10000 znaków), a AI wygeneruje propozycje fiszek do nauki
          </p>
        </div>

        {/* Source Text Form */}
        <div className="mb-8">
          <SourceTextForm
            value={formState}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
            isSubmitting={isFormDisabled}
          />
        </div>

        {/* Generation Status (loading/error) */}
        {(status === "pending" || status === "submitting" || error) && (
          <div className="mb-8">
            <GenerationStatusPanel status={status} progress={progress} error={error} onRetry={reset} />
          </div>
        )}

        {/* Proposals Section */}
        {showProposals && (
          <div className="mb-8">
            <ProposalsSection
              proposals={proposals}
              selection={selection}
              onToggleAccept={toggleAccept}
              onEditProposal={handleProposalChange}
              onCommit={handleCommit}
              isCommitting={status === "committing"}
            />
          </div>
        )}

        {/* Manual Flashcard Form */}
        <div className="mt-12 border-t pt-8">
          <ManualFlashcardForm remainingSlots={selection.remainingSlots} onCreated={reset} />
        </div>
      </div>
    </div>
  );
}

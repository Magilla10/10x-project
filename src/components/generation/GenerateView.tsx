import { useState } from "react";
import type { GenerationFormState } from "@/lib/viewModels/generationView";
import { SourceTextForm } from "./SourceTextForm";
import { GenerationStatusPanel } from "./GenerationStatusPanel";
import { ProposalsSection } from "./ProposalsSection";
import { ManualFlashcardForm } from "./ManualFlashcardForm";
import { useAiGeneration } from "@/lib/hooks/useAiGeneration";
import { Button } from "@/components/ui/button";

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
    <div className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-blue-900 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-20%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="absolute bottom-[-25%] right-[10%] h-[520px] w-[520px] rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute bottom-[5%] left-[-12%] h-[360px] w-[360px] rounded-full bg-purple-600/20 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-20 pt-16 md:px-8 lg:gap-16">
        <header className="space-y-8 text-center text-white md:text-left">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-100/90 md:justify-start">
            <span
              className="size-2 rounded-full bg-indigo-300 shadow-[0_0_0_4px_rgba(129,140,248,0.35)]"
              aria-hidden="true"
            />
            Tryb generowania
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Generowanie fiszek</h1>
            <p className="mx-auto max-w-3xl text-base text-white/75 md:text-lg md:leading-relaxed md:text-white/80 lg:mx-0">
              Wklej fragment notatek, artykułu lub wykładu, a my pomożemy Ci przekształcić go w gotowe do nauki fiszki.
              Możesz także od razu dodawać własne fiszki ręcznie, aby mieć pełną kontrolę nad materiałem.
            </p>
          </div>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,_1.25fr)_minmax(0,_0.75fr)]">
          <div className="flex flex-col gap-6">
            <ManualFlashcardForm remainingSlots={selection.remainingSlots} onCreated={reset} />

            <div className="grid gap-4 text-left text-xs text-white/70 sm:grid-cols-3 sm:text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg shadow-indigo-950/20 backdrop-blur">
                <p className="font-semibold text-white">1. Wklej materiał</p>
                <p className="mt-1 text-white/70">
                  Minimum 1000 znaków, maksymalnie 10 000 – im więcej kontekstu, tym lepsze fiszki.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg shadow-indigo-950/20 backdrop-blur">
                <p className="font-semibold text-white">2. Oceń propozycje</p>
                <p className="mt-1 text-white/70">
                  Zaznacz najlepsze karty, edytuj ich treść lub usuń zbędne fragmenty.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg shadow-indigo-950/20 backdrop-blur">
                <p className="font-semibold text-white">3. Zapisz i kontynuuj</p>
                <p className="mt-1 text-white/70">
                  Dodaj własne fiszki i przejdź do biblioteki, aby powtarzać materiał.
                </p>
              </div>
            </div>

            <SourceTextForm
              value={formState}
              onChange={handleFormChange}
              onSubmit={handleSubmit}
              isSubmitting={isFormDisabled}
            />

            {(status === "pending" || status === "submitting" || error) && (
              <GenerationStatusPanel status={status} progress={progress} error={error} onRetry={reset} />
            )}

            {showProposals && (
              <ProposalsSection
                proposals={proposals}
                selection={selection}
                onToggleAccept={toggleAccept}
                onEditProposal={handleProposalChange}
                onCommit={handleCommit}
                isCommitting={status === "committing"}
              />
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-6 rounded-3xl border border-white/15 bg-white/10 p-8 text-sm text-white/80 shadow-2xl shadow-indigo-950/25 backdrop-blur">
              <h2 className="text-2xl font-semibold text-white">Wskazówki dla lepszych fiszek</h2>
              <p className="text-white/70">
                Krótkie, konkretne zdania i własne przykłady zwiększają skuteczność nauki. W trakcie edycji skup się na
                informacjach, które chcesz powtarzać.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span
                    className="mt-1 size-2 rounded-full bg-indigo-300 shadow-[0_0_0_4px_rgba(129,140,248,0.35)]"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <p className="font-medium text-white">Zadawaj pytania</p>
                    <p className="text-white/70">
                      Formułuj przód fiszki w formie pytania, aby zmusić mózg do aktywnego przypominania.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    className="mt-1 size-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(52,211,153,0.3)]"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <p className="font-medium text-white">Dodawaj przykłady</p>
                    <p className="text-white/70">
                      Na odwrocie fiszki dopisuj kontekst lub skrót myślowy, który pomoże zapamiętać treść.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    className="mt-1 size-2 rounded-full bg-sky-300 shadow-[0_0_0_4px_rgba(125,211,252,0.3)]"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <p className="font-medium text-white">Limituj liczbę fiszek</p>
                    <p className="text-white/70">
                      Wybieraj najważniejsze informacje – krótsze sesje powtórek są skuteczniejsze.
                    </p>
                  </div>
                </li>
              </ul>

              <Button variant="pill" asChild className="mt-2" data-test-id="view-saved-flashcards-button">
                <a href="/flashcards">Zobacz zapisane fiszki</a>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

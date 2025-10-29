import { useState, type ReactNode } from "react";
import type { GenerationFormState } from "@/lib/viewModels/generationView";
import { SourceTextForm } from "./SourceTextForm";
import { GenerationStatusPanel } from "./GenerationStatusPanel";
import { ProposalsSection } from "./ProposalsSection";
import { ManualFlashcardForm } from "./ManualFlashcardForm";
import { useAiGeneration } from "@/lib/hooks/useAiGeneration";
import { Button } from "@/components/ui/button";

export const ENABLE_AI_GENERATION = false as const;

/**
 * View component for the flashcard generation page.
 * Allows toggling the AI flow without removing the implementation.
 */
export default function GenerateView() {
  if (!ENABLE_AI_GENERATION) {
    return <ManualGenerationView />;
  }

  return <AiDrivenGenerationView />;
}

function ManualGenerationView() {
  return (
    <PageShell
      badgeLabel="Tryb ręczny"
      title="Tworzenie fiszek"
      description="Dodawaj fiszki ręcznie i zapisuj je w swojej bibliotece. Masz pełną kontrolę nad treścią – wpisz pytanie, dodaj odpowiedź i utrwalaj najważniejsze informacje."
    >
      <div className="mx-auto w-full max-w-[900px]">
        <ManualFlashcardForm />
      </div>
    </PageShell>
  );
}

function AiDrivenGenerationView() {
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
    <PageShell
      badgeLabel="Tryb generowania"
      title="Generowanie fiszek"
      description="Wklej fragment notatek, artykułu lub wykładu, a my pomożemy Ci przekształcić go w gotowe do nauki fiszki. Możesz także od razu dodawać własne fiszki ręcznie, aby mieć pełną kontrolę nad materiałem."
    >
      <ManualFlashcardForm remainingSlots={selection.remainingSlots} onCreated={reset} />
      <StepsGrid />
      <SourceTextForm value={formState} onChange={handleFormChange} onSubmit={handleSubmit} isSubmitting={isFormDisabled} />

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
    </PageShell>
  );
}

interface PageShellProps {
  badgeLabel: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
}

function PageShell({ badgeLabel, title, description, children }: PageShellProps) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-[#120024] via-[#081132] to-[#001f34] text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-20%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#ff3ecf33] blur-3xl" />
        <div className="absolute bottom-[-25%] right-[10%] h-[520px] w-[520px] rounded-full bg-[#27e0ff33] blur-3xl" />
        <div className="absolute bottom-[5%] left-[-12%] h-[360px] w-[360px] rounded-full bg-[#7c3aed2e] blur-[140px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-20 pt-16 md:px-8 lg:gap-16">
        <header className="space-y-8 text-center text-white md:text-left">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100/90 shadow-[0_0_40px_rgba(236,72,153,0.25)] md:justify-start">
            <span className="size-2 rounded-full bg-[#ff3ecf] shadow-[0_0_0_6px_rgba(255,62,207,0.25)]" aria-hidden="true" />
            {badgeLabel}
          </div>

          <div className="space-y-4">
            <h1 className="bg-gradient-to-r from-purple-100 via-white to-cyan-100 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
              {title}
            </h1>
            <p className="mx-auto max-w-3xl text-base text-white/75 md:text-lg md:leading-relaxed md:text-white/80 lg:mx-0">
              {description}
            </p>
          </div>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,_1.25fr)_minmax(0,_0.75fr)] lg:items-stretch">
          <div className="flex flex-col gap-6">{children}</div>

          <aside className="hidden lg:block lg:h-full">
            <TipsAside />
          </aside>
        </div>
      </div>
    </div>
  );
}

function StepsGrid() {
  return (
    <div className="grid gap-4 text-left text-xs text-white/70 sm:grid-cols-3 sm:text-sm">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-purple-400/10 to-transparent p-4 shadow-lg shadow-indigo-950/20 backdrop-blur">
        <p className="font-semibold text-white">1. Wklej materiał</p>
        <p className="mt-1 text-white/70">Minimum 1000 znaków, maksymalnie 10 000 – im więcej kontekstu, tym lepsze fiszki.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-fuchsia-400/10 to-transparent p-4 shadow-lg shadow-indigo-950/20 backdrop-blur">
        <p className="font-semibold text-white">2. Oceń propozycje</p>
        <p className="mt-1 text-white/70">Zaznacz najlepsze karty, edytuj ich treść lub usuń zbędne fragmenty.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-cyan-400/10 to-transparent p-4 shadow-lg shadow-indigo-950/20 backdrop-blur">
        <p className="font-semibold text-white">3. Zapisz i kontynuuj</p>
        <p className="mt-1 text-white/70">Dodaj własne fiszki i przejdź do biblioteki, aby powtarzać materiał.</p>
      </div>
    </div>
  );
}

function TipsAside() {
  return (
    <div className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-white/15 bg-white/10 p-8 text-sm text-white/80 shadow-2xl shadow-indigo-950/25 backdrop-blur">
      <h2 className="bg-gradient-to-r from-purple-100 via-white to-cyan-100 bg-clip-text text-2xl font-semibold text-transparent">
        Wskazówki dla lepszych fiszek
      </h2>
      <p className="text-white/70">
        Krótkie, konkretne zdania i własne przykłady zwiększają skuteczność nauki. Skup się na informacjach, które chcesz regularnie powtarzać.
      </p>
      <ul className="space-y-4">
        <li className="flex items-start gap-3">
          <span className="mt-1 size-2 rounded-full bg-[#ff3ecf] shadow-[0_0_0_6px_rgba(255,62,207,0.25)]" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium text-white">Formułuj pytania</p>
            <p className="text-white/70">Front fiszki pisz w formie pytania – aktywne odtwarzanie wiedzy wzmacnia pamięć.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-1 size-2 rounded-full bg-[#27e0ff] shadow-[0_0_0_6px_rgba(39,224,255,0.25)]" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium text-white">Dodawaj kontekst</p>
            <p className="text-white/70">Na odwrocie zapisuj krótkie przykłady lub skojarzenia, które ułatwią przypomnienie treści.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="mt-1 size-2 rounded-full bg-[#9dff6b] shadow-[0_0_0_6px_rgba(157,255,107,0.25)]" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium text-white">Powtarzaj regularnie</p>
            <p className="text-white/70">Małe porcje materiału przyswajane systematycznie są skuteczniejsze niż długa jednorazowa sesja.</p>
          </div>
        </li>
      </ul>

      <Button
        variant="pill"
        asChild
        className="mt-2 bg-gradient-to-r from-[#ff3ecf]/80 via-[#fe6cb6]/80 to-[#27e0ff]/80 text-white hover:from-[#ff3ecf] hover:via-[#fe6cb6] hover:to-[#27e0ff]"
        data-test-id="view-saved-flashcards-button"
      >
        <a href="/flashcards">Zobacz zapisane fiszki</a>
      </Button>
    </div>
  );
}

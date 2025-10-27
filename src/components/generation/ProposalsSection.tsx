import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EditableProposedFlashcard, CommitSelectionState } from "@/lib/viewModels/generationView";
import { countCodePoints } from "@/lib/utils/validation";

interface ProposalsSectionProps {
  proposals: EditableProposedFlashcard[];
  selection: CommitSelectionState;
  onToggleAccept: (proposalId: string) => void;
  onEditProposal: (proposalId: string, front: string, back: string) => void;
  onCommit: () => void;
  isCommitting: boolean;
}

/**
 * Section displaying all proposals with edit and accept/reject actions
 */
export function ProposalsSection({
  proposals,
  selection,
  onToggleAccept,
  onEditProposal,
  onCommit,
  isCommitting,
}: ProposalsSectionProps) {
  const canCommit = selection.selectedCount > 0 && !isCommitting;

  return (
    <div className="space-y-6 text-white">
      <Card className="border-white/15 bg-white/10 text-white shadow-2xl shadow-indigo-950/20 backdrop-blur-xl">
        <CardContent className="flex flex-col gap-3 rounded-3xl py-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white/90">
              Zaznaczono: {selection.selectedCount} / {proposals.length}
            </p>
            <p className="text-xs text-white/60">Dostępne miejsca: {selection.remainingSlots}</p>
          </div>
          <Button
            onClick={onCommit}
            disabled={!canCommit}
            className="w-full rounded-full shadow-lg shadow-indigo-500/30 md:w-auto"
            size="lg"
          >
            {isCommitting ? "Zapisywanie..." : "Zapisz zaznaczone"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.proposalId}
            proposal={proposal}
            onToggleAccept={onToggleAccept}
            onEdit={onEditProposal}
          />
        ))}
      </div>
    </div>
  );
}

interface ProposalCardProps {
  proposal: EditableProposedFlashcard;
  onToggleAccept: (proposalId: string) => void;
  onEdit: (proposalId: string, front: string, back: string) => void;
}

function ProposalCard({ proposal, onToggleAccept, onEdit }: ProposalCardProps) {
  const frontLength = countCodePoints(proposal.frontDraft);
  const backLength = countCodePoints(proposal.backDraft);

  return (
    <Card
      className={cn(
        "border-white/10 bg-white/10 text-white shadow-2xl shadow-indigo-950/20 backdrop-blur-xl transition duration-300",
        proposal.accepted && "border-emerald-300/70 bg-emerald-400/10 shadow-emerald-900/40"
      )}
    >
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <CardTitle className="flex items-center gap-3 text-base text-white">
          {proposal.edited && (
            <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs text-yellow-200">Edytowano</span>
          )}
          Propozycja
        </CardTitle>
        <Button
          size="sm"
          variant={proposal.accepted ? "default" : "outline"}
          onClick={() => onToggleAccept(proposal.proposalId)}
          className={cn(
            "rounded-full border-white/30 px-4 text-xs tracking-wide",
            proposal.accepted && "bg-emerald-400 text-emerald-950 hover:bg-emerald-300",
            !proposal.accepted && "text-white hover:bg-white/15"
          )}
        >
          {proposal.accepted ? "Zaznaczono ✓" : "Zaznacz"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 text-sm text-white">
        <div className="space-y-2">
          <label
            htmlFor={`proposal-front-${proposal.proposalId}`}
            className="block text-xs font-medium uppercase tracking-wide text-white/60"
          >
            Przód fiszki
          </label>
          <textarea
            id={`proposal-front-${proposal.proposalId}`}
            value={proposal.frontDraft}
            onChange={(e) => onEdit(proposal.proposalId, e.target.value, proposal.backDraft)}
            rows={2}
            className={cn(
              "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm shadow-lg shadow-indigo-950/10 transition",
              "placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-300/80",
              proposal.validation?.front && "border-red-400/80 focus:ring-red-300/70"
            )}
          />
          <div className="mt-1 flex justify-between text-xs">
            {proposal.validation?.front ? (
              <p className="text-red-300">{proposal.validation.front}</p>
            ) : (
              <p className="text-white/60">10-200 znaków</p>
            )}
            <p className={cn(frontLength >= 10 && frontLength <= 200 ? "text-emerald-300" : "text-white/50")}>
              {frontLength}/200
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`proposal-back-${proposal.proposalId}`}
            className="block text-xs font-medium uppercase tracking-wide text-white/60"
          >
            Tył fiszki
          </label>
          <textarea
            id={`proposal-back-${proposal.proposalId}`}
            value={proposal.backDraft}
            onChange={(e) => onEdit(proposal.proposalId, proposal.frontDraft, e.target.value)}
            rows={4}
            className={cn(
              "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm shadow-lg shadow-indigo-950/10 transition",
              "placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-300/80",
              proposal.validation?.back && "border-red-400/80 focus:ring-red-300/70"
            )}
          />
          <div className="mt-1 flex justify-between text-xs">
            {proposal.validation?.back ? (
              <p className="text-red-300">{proposal.validation.back}</p>
            ) : (
              <p className="text-white/60">10-500 znaków</p>
            )}
            <p className={cn(backLength >= 10 && backLength <= 500 ? "text-emerald-300" : "text-white/50")}>
              {backLength}/500
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

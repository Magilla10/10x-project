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
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">
                Zaznaczono: {selection.selectedCount} / {proposals.length}
              </p>
              <p className="text-xs text-muted-foreground">Dostępne miejsca: {selection.remainingSlots}</p>
            </div>
            <Button onClick={onCommit} disabled={!canCommit}>
              {isCommitting ? "Zapisywanie..." : "Zapisz zaznaczone"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Proposals List */}
      <div className="space-y-3">
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
    <Card className={cn(proposal.accepted && "border-green-500 bg-green-50 dark:bg-green-950/20")}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-base">
            {proposal.edited && <span className="text-yellow-600 mr-2">(edytowano)</span>}
            Propozycja
          </CardTitle>
          <Button
            size="sm"
            variant={proposal.accepted ? "default" : "outline"}
            onClick={() => onToggleAccept(proposal.proposalId)}
          >
            {proposal.accepted ? "Zaznaczono ✓" : "Zaznacz"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Front */}
        <div>
          <label htmlFor={`proposal-front-${proposal.proposalId}`} className="block text-sm font-medium mb-1">
            Przód fiszki
          </label>
          <textarea
            id={`proposal-front-${proposal.proposalId}`}
            value={proposal.frontDraft}
            onChange={(e) => onEdit(proposal.proposalId, e.target.value, proposal.backDraft)}
            rows={2}
            className={cn(
              "w-full px-3 py-2 rounded-md border bg-background text-sm resize-y",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              proposal.validation?.front && "border-destructive"
            )}
          />
          <div className="flex justify-between mt-1 text-xs">
            {proposal.validation?.front ? (
              <p className="text-destructive">{proposal.validation.front}</p>
            ) : (
              <p className="text-muted-foreground">10-200 znaków</p>
            )}
            <p className={cn(frontLength >= 10 && frontLength <= 200 ? "text-green-600" : "text-muted-foreground")}>
              {frontLength}/200
            </p>
          </div>
        </div>

        {/* Back */}
        <div>
          <label htmlFor={`proposal-back-${proposal.proposalId}`} className="block text-sm font-medium mb-1">
            Tył fiszki
          </label>
          <textarea
            id={`proposal-back-${proposal.proposalId}`}
            value={proposal.backDraft}
            onChange={(e) => onEdit(proposal.proposalId, proposal.frontDraft, e.target.value)}
            rows={4}
            className={cn(
              "w-full px-3 py-2 rounded-md border bg-background text-sm resize-y",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              proposal.validation?.back && "border-destructive"
            )}
          />
          <div className="flex justify-between mt-1 text-xs">
            {proposal.validation?.back ? (
              <p className="text-destructive">{proposal.validation.back}</p>
            ) : (
              <p className="text-muted-foreground">10-500 znaków</p>
            )}
            <p className={cn(backLength >= 10 && backLength <= 500 ? "text-green-600" : "text-muted-foreground")}>
              {backLength}/500
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

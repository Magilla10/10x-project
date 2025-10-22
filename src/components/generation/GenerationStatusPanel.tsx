import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { GenerationStatus, GenerationProgressState, UiError } from "@/lib/viewModels/generationView";

interface GenerationStatusPanelProps {
  status: GenerationStatus;
  progress: GenerationProgressState;
  error?: UiError;
  onRetry?: () => void;
}

/**
 * Simple status panel for generation (loading/error)
 */
export function GenerationStatusPanel({ status, progress, error, onRetry }: GenerationStatusPanelProps) {
  // Loading state
  if (status === "pending" || status === "submitting") {
    const elapsed = progress.startedAt ? Math.floor((Date.now() - progress.startedAt) / 1000) : 0;
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-lg font-medium">Generowanie fiszek...</p>
            <p className="text-sm text-muted-foreground">Czas: {elapsed}s / 5s</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-destructive mb-2">Wystąpił błąd</h3>
              <p className="text-sm">{error.message}</p>
              {error.code && <p className="text-xs text-muted-foreground mt-1">Kod błędu: {error.code}</p>}
            </div>
            {onRetry && (
              <Button onClick={onRetry} variant="outline">
                Spróbuj ponownie
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

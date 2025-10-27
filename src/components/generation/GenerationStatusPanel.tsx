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
      <Card className="border-white/15 bg-white/10 text-white shadow-2xl shadow-indigo-950/30 backdrop-blur-xl">
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center space-y-4 text-white">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
            <p className="text-lg font-medium">Generowanie fiszek...</p>
            <p className="text-sm text-white/70">Czas: {elapsed}s / 5s</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-300/60 bg-red-500/15 text-white shadow-2xl shadow-red-950/20 backdrop-blur-xl">
        <CardContent className="py-6">
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-lg font-semibold text-red-100">Wystąpił błąd</h3>
              <p className="text-sm text-red-100/90">{error.message}</p>
              {error.code && <p className="mt-1 text-xs text-red-100/70">Kod błędu: {error.code}</p>}
            </div>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="border-white/30 text-white hover:bg-white/20">
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

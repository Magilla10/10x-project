import { useEffect, useState } from "react";
import { Loader2, Pencil, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ApiError,
  deleteFlashcardRequest,
  getFlashcards,
  patchFlashcard,
} from "@/lib/api/aiGenerationsClient";
import type { FlashcardDto } from "@/types";

interface EditableFlashcard extends FlashcardDto {
  isEditing?: boolean;
  draftFront?: string;
  draftBack?: string;
  isSaving?: boolean;
  isDeleting?: boolean;
  error?: string | null;
  isFlipped?: boolean;
}

export function FlashcardsList() {
  const [flashcards, setFlashcards] = useState<EditableFlashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlashcards = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const { flashcards } = await getFlashcards();
        setFlashcards(flashcards);
      } catch (error) {
        if (error instanceof ApiError) {
          setLoadError(error.message);
        } else {
          setLoadError("Nie udało się pobrać fiszek.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchFlashcards();
  }, []);

  const handleStartEdit = (id: string) => {
    setFlashcards((current) =>
      current.map((flashcard) =>
        flashcard.id === id
          ? {
              ...flashcard,
              isEditing: true,
              draftFront: flashcard.front,
              draftBack: flashcard.back,
              error: null,
            }
          : flashcard
      )
    );
  };

  const handleCancelEdit = (id: string) => {
    setFlashcards((current) =>
      current.map((flashcard) =>
        flashcard.id === id
          ? {
              ...flashcard,
              isEditing: false,
              draftFront: undefined,
              draftBack: undefined,
              error: null,
            }
          : flashcard
      )
    );
  };

  const handleDraftChange = (id: string, field: "draftFront" | "draftBack", value: string) => {
    setFlashcards((current) =>
      current.map((flashcard) =>
        flashcard.id === id
          ? {
              ...flashcard,
              [field]: value,
            }
          : flashcard
      )
    );
  };

  const handleSave = async (id: string) => {
    setFlashcards((current) =>
      current.map((flashcard) =>
        flashcard.id === id
          ? {
              ...flashcard,
              isSaving: true,
              error: null,
            }
          : flashcard
      )
    );

    const flashcard = flashcards.find((card) => card.id === id);
    if (!flashcard) {
      return;
    }

    try {
      const { flashcard: updated } = await patchFlashcard(id, {
        front: flashcard.draftFront?.trim(),
        back: flashcard.draftBack?.trim(),
      });

      setFlashcards((current) =>
        current.map((card) =>
          card.id === id
            ? {
                ...updated,
                isEditing: false,
                draftFront: undefined,
                draftBack: undefined,
                isSaving: false,
                error: null,
              }
            : card
        )
      );
    } catch (error) {
      setFlashcards((current) =>
        current.map((card) =>
          card.id === id
            ? {
                ...card,
                isSaving: false,
                error: error instanceof ApiError ? error.message : "Nie udało się zapisać zmian.",
              }
            : card
        )
      );
    }
  };

  const handleDelete = async (id: string) => {
    setFlashcards((current) =>
      current.map((flashcard) =>
        flashcard.id === id
          ? {
              ...flashcard,
              isDeleting: true,
              error: null,
            }
          : flashcard
      )
    );

    try {
      await deleteFlashcardRequest(id);
      setFlashcards((current) => current.filter((flashcard) => flashcard.id !== id));
      setSuccessMessage("Fiszka została usunięta!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setFlashcards((current) =>
        current.map((flashcard) =>
          flashcard.id === id
            ? {
                ...flashcard,
                isDeleting: false,
                error: error instanceof ApiError ? error.message : "Nie udało się usunąć fiszki.",
              }
            : flashcard
        )
      );
    }
  };

  const handleFlip = (id: string) => {
    setFlashcards((current) =>
      current.map((flashcard) =>
        flashcard.id === id
          ? {
              ...flashcard,
              isFlipped: !flashcard.isFlipped,
            }
          : flashcard
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12" role="status" aria-live="polite">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        <span className="sr-only">Ładowanie fiszek...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Twoje fiszki</CardTitle>
          <CardDescription>Wystąpił błąd podczas ładowania fiszek</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{loadError}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Odśwież stronę
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (flashcards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Twoje fiszki</CardTitle>
          <CardDescription>Na razie nie masz żadnych fiszek.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dodaj fiszki na stronie generowania lub ręcznie, aby pojawiły się w tym miejscu.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {successMessage && (
        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-500 dark:bg-green-950/20">
          <p className="text-sm text-green-700 dark:text-green-400">{successMessage}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {flashcards.map((flashcard) => (
        <Card key={flashcard.id} aria-live="polite">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Fiszka</CardTitle>
              <CardDescription>{flashcard.source === "manual" ? "Dodana ręcznie" : "Wygenerowana przez AI"}</CardDescription>
            </div>
            <div className="flex gap-2">
              {flashcard.isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelEdit(flashcard.id)}
                    disabled={flashcard.isSaving}
                  >
                    <X className="size-4" aria-hidden="true" /> Anuluj
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave(flashcard.id)}
                    disabled={flashcard.isSaving || flashcard.isDeleting}
                  >
                    {flashcard.isSaving ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Save className="size-4" aria-hidden="true" />
                    )}
                    Zapisz
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartEdit(flashcard.id)}
                  disabled={flashcard.isDeleting}
                >
                  <Pencil className="size-4" aria-hidden="true" /> Edytuj
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(flashcard.id)}
                disabled={flashcard.isDeleting || flashcard.isSaving}
              >
                {flashcard.isDeleting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
                Usuń
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {flashcard.isEditing ? (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Przód</h3>
                  <Textarea
                    value={flashcard.draftFront ?? ""}
                    onChange={(event) => handleDraftChange(flashcard.id, "draftFront", event.target.value)}
                    rows={3}
                    disabled={flashcard.isSaving}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Tył</h3>
                  <Textarea
                    value={flashcard.draftBack ?? ""}
                    onChange={(event) => handleDraftChange(flashcard.id, "draftBack", event.target.value)}
                    rows={4}
                    disabled={flashcard.isSaving}
                  />
                </div>
              </>
            ) : (
              <>
                {!flashcard.isFlipped ? (
                  <div className="cursor-pointer" onClick={() => handleFlip(flashcard.id)}>
                    <h3 className="text-sm font-semibold text-muted-foreground">Przód</h3>
                    <p className="mt-2 whitespace-pre-line text-sm">{flashcard.front}</p>
                  </div>
                ) : (
                  <div className="cursor-pointer" onClick={() => handleFlip(flashcard.id)}>
                    <h3 className="text-sm font-semibold text-muted-foreground">Tył</h3>
                    <p className="mt-2 whitespace-pre-line text-sm">{flashcard.back}</p>
                  </div>
                )}
              </>
            )}

            {flashcard.error && (
              <p className="text-sm text-destructive">{flashcard.error}</p>
            )}
          </CardContent>
        </Card>
      ))}
      </div>
    </>
  );
}


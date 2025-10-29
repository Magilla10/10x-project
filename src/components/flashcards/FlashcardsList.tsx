import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, deleteFlashcardRequest, getFlashcards, patchFlashcard } from "@/lib/api/aiGenerationsClient";
import type { FlashcardDto } from "@/types";
import { Input } from "@/components/ui/input";

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
  const [searchQuery, setSearchQuery] = useState("");

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

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const visibleFlashcards = useMemo(() => {
    if (!normalizedQuery) {
      return flashcards;
    }

    return flashcards.filter((card) => {
      const front = card.front.toLowerCase();
      const back = card.back.toLowerCase();
      return front.includes(normalizedQuery) || back.includes(normalizedQuery);
    });
  }, [flashcards, normalizedQuery]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12" role="status" aria-live="polite">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
        <span className="sr-only">Ładowanie fiszek...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <Card className="border-white/15 bg-white/10 text-white shadow-2xl shadow-indigo-950/30 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Twoje fiszki</CardTitle>
          <CardDescription className="text-white/70">Wystąpił błąd podczas ładowania fiszek</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-100/90">{loadError}</p>
          <Button className="mt-4 shadow-lg shadow-indigo-500/30" onClick={() => window.location.reload()}>
            Odśwież stronę
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (flashcards.length === 0) {
    return (
      <Card className="border-white/15 bg-white/10 text-white shadow-2xl shadow-indigo-950/30 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Twoje fiszki</CardTitle>
          <CardDescription className="text-white/70">Na razie nie masz żadnych fiszek.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/60">
            Dodaj fiszki na stronie generowania lub ręcznie, aby pojawiły się w tym miejscu.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {successMessage && (
        <div className="mb-4 rounded-xl border border-fuchsia-300/60 bg-fuchsia-400/10 p-3 shadow-[0_0_40px_-20px_rgba(236,72,153,0.6)]" data-test-id="flashcard-deleted-message">
          <p className="text-sm text-fuchsia-100">{successMessage}</p>
        </div>
      )}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Szukaj fiszek po pytaniu lub odpowiedzi..."
          className="border border-white/15 bg-white/10 text-white placeholder:text-white/60 focus-visible:border-fuchsia-300/70 focus-visible:ring-[#ff3ecf66]"
          aria-label="Wyszukaj fiszki"
        />
      </div>

      {visibleFlashcards.length === 0 ? (
        <Card className="border-white/15 bg-gradient-to-br from-white/10 via-purple-400/10 to-transparent text-white shadow-[0_45px_120px_-60px_rgba(56,189,248,0.75)] backdrop-blur-xl">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-white/70">
              Brak wyników dla zapytania <span className="font-semibold text-white">{searchQuery}</span>.
            </p>
            <p className="mt-2 text-sm text-white/60">Spróbuj wyszukać inną frazę lub wyczyść filtr.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {visibleFlashcards.map((flashcard) => (
          <Card
            key={flashcard.id}
            className="border border-white/10 bg-gradient-to-br from-white/10 via-slate-100/5 to-transparent text-white shadow-[0_45px_120px_-60px_rgba(56,189,248,0.75)] backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-1 hover:border-fuchsia-300/50"
            aria-live="polite"
            data-test-id={`flashcard-item-${flashcard.id}`}
          >
            <CardHeader>
              <CardTitle className="text-white">Fiszka</CardTitle>
              <CardDescription className="text-white/60">
                {flashcard.source === "manual" ? "Dodana ręcznie" : "Wygenerowana przez AI"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {flashcard.isEditing ? (
                <>
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">Przód</h3>
                    <Textarea
                      value={flashcard.draftFront ?? ""}
                      onChange={(event) => handleDraftChange(flashcard.id, "draftFront", event.target.value)}
                      rows={3}
                      disabled={flashcard.isSaving}
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-base text-white shadow-lg shadow-indigo-950/10 transition placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-300/80"
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">Tył</h3>
                    <Textarea
                      value={flashcard.draftBack ?? ""}
                      onChange={(event) => handleDraftChange(flashcard.id, "draftBack", event.target.value)}
                      rows={4}
                      disabled={flashcard.isSaving}
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-base text-white shadow-lg shadow-indigo-950/10 transition placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-300/80"
                    />
                  </div>
                </>
              ) : (
                <>
                  {!flashcard.isFlipped ? (
                    <div
                      className="cursor-pointer"
                      onClick={() => handleFlip(flashcard.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleFlip(flashcard.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label="Obróć fiszkę na tył"
                    >
                      <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">Przód</h3>
                      <p className="mt-3 whitespace-pre-line text-base text-white/90">{flashcard.front}</p>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer"
                      onClick={() => handleFlip(flashcard.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleFlip(flashcard.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label="Obróć fiszkę na przód"
                    >
                      <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">Tył</h3>
                      <p className="mt-3 whitespace-pre-line text-base text-white/90">{flashcard.back}</p>
                    </div>
                  )}
                </>
              )}

              {flashcard.error && <p className="text-sm text-red-300">{flashcard.error}</p>}
            </CardContent>
            <CardFooter className="justify-end gap-2">
              {flashcard.isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelEdit(flashcard.id)}
                    disabled={flashcard.isSaving}
                    className="border-white/50 bg-white/80 text-slate-900 hover:bg-white/90"
                    data-test-id={`cancel-edit-flashcard-button-${flashcard.id}`}
                  >
                    <X className="size-4" aria-hidden="true" /> Anuluj
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave(flashcard.id)}
                    disabled={flashcard.isSaving || flashcard.isDeleting}
                    className="bg-gradient-to-r from-[#ff3ecf] via-[#fe6cb6] to-[#27e0ff] text-white shadow-[0_20px_55px_-28px_rgba(236,72,153,0.85)] transition-transform duration-300 hover:scale-105"
                    data-test-id={`save-flashcard-button-${flashcard.id}`}
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
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartEdit(flashcard.id)}
                    disabled={flashcard.isDeleting}
                    className="border-white/40 bg-white/70 text-slate-900 transition-colors hover:border-fuchsia-400/60 hover:bg-white/90"
                    data-test-id={`edit-flashcard-button-${flashcard.id}`}
                  >
                    <Pencil className="size-4" aria-hidden="true" /> Edytuj
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(flashcard.id)}
                    disabled={flashcard.isDeleting || flashcard.isSaving}
                    className="border-red-400/80 bg-red-500/80 text-red-100 hover:bg-red-500"
                    data-test-id={`delete-flashcard-button-${flashcard.id}`}
                  >
                    {flashcard.isDeleting ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-4" aria-hidden="true" />
                    )}
                    Usuń
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
          ))}
        </div>
      )}
    </>
  );
}

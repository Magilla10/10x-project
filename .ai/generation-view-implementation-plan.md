# Plan implementacji widoku Generowanie fiszek (AI)

## 1. Przegląd

Widok służy do wklejenia dłuższego tekstu (1000–10000 znaków), uruchomienia generowania propozycji fiszek przez AI, a następnie przeglądu oraz akceptacji/edycji/odrzucania propozycji. Użytkownik może też utworzyć pojedynczą fiszkę manualnie (US-004). Czas generacji musi być nieodczuwalny – do 5 sekund. Interfejs zapewnia jasne walidacje inline, wskaźniki postępu i ograniczenia (limit 15 fiszek na użytkownika). Widok umożliwia użytkownikowi wprowadzenie tekstu i wysłanie go do API w celu wygenerowania propozycji fiszek przez AI. Następnie użytkownik może przeglądać, zatwierdzać, edytować lub odrzucać wygenerowane propozycje fiszek. Na koniec może zapisać do bazy danych wszystkie bądź tylko zaakceptowane fiszki.

## 2. Routing widoku

- Ścieżka: `/generate`
- Plik strony: `src/pages/generate.astro`
- Główny komponent (React island): `src/components/generation/GenerateView.tsx`

Widok powinien być dostępny pod ścieżką `/generate`.

## 3. Struktura komponentów

- GenerateView (root, equivalent to FlashcardGenerationView)
  - SourceTextForm (equivalent to TextInputArea)
    - TextareaWithCounter
    - ModelSelect
    - TemperatureInput
    - MaxFlashcardsHint
    - GenerateButton
  - GenerationStatusPanel (equivalent to SkeletonLoader and ErrorNotification)
  - ProposalsSection (equivalent to FlashcardList)
    - ProposalsToolbar (zbiorczy zapis, selekcja, licznik wybranych; equivalent to BulkSaveButton)
    - ProposalsList
      - ProposalCard (xN; equivalent to FlashcardListItem)
        - Inline front/back + liczniki, Accept/Reject toggle, Edit (opcjonalny Dialog)
        - EditProposalDialog (opcjonalnie)
  - ManualFlashcardForm (sekcja dodatkowa zgodnie z US-004)

- **FlashcardGenerationView** – główny komponent widoku zawierający logikę i strukturę strony (mapped to GenerateView).
  - **TextInputArea** – komponent tekstowego pola wejściowego do wklejania tekstu (mapped to SourceTextForm).
  - **GenerateButton** – przycisk inicjujący proces generowania fiszek.
  - **FlashcardList** – lista wyświetlająca propozycje fiszek otrzymanych z API (mapped to ProposalsSection).
    - **FlashcardListItem** – pojedynczy element listy, reprezentujący jedną propozycję fiszki (mapped to ProposalCard).
  - **SkeletonLoader** – komponent wskaźnika ładowania (skeleton), wyświetlany podczas oczekiwania na odpowiedź API (integrated in GenerationStatusPanel).
  - **BulkSaveButton** – przyciski do zapisu wszystkich fiszek lub tylko zaakceptowanych (mapped to ProposalsToolbar).
  - **ErrorNotification** – komponent do wyświetlania komunikatów o błędach (integrated in GenerationStatusPanel).

## 4. Szczegóły komponentów

### GenerateView (FlashcardGenerationView)

- Opis: Orkiestracja przepływu: formularz źródła, status generacji, lista propozycji, toolbar zbiorczy, formularz manualny. Główny widok, który integruje wszystkie komponenty niezbędne do generowania i przeglądania fiszek.
- Główne elementy: układ strony, nagłówek, sekcje formularzy i wyników, komunikaty o limitach. Pole tekstowe, przycisk generowania, lista fiszek, loader i komunikaty o błędach.
- Obsługiwane interakcje: inicjacja generowania, polling wyników, akceptacja/odrzucanie/edycja, zbiorczy commit, tworzenie manualnej fiszki. Zmiana wartości w polu tekstowym, kliknięcie przycisku generowania, interakcje z kartami fiszek (zatwierdzenie, edycja, odrzucenie), kliknięcie przycisku zapisu.
- Obsługiwana walidacja: delegowana do komponentów podrzędnych; Guardy na limit 15 fiszek, długości pól i poprawność parametrów modelu/temperature. Tekst musi mieć długość od 1000 do 10000 znaków.
- Typy: `GenerationViewState`, `EditableProposedFlashcard`, `GenerationFormState` (patrz sekcja 5). Używa typów `CreateGenerationCommand` oraz `CreateGenerationResponseDto`.
- Propsy: brak (root). Może otrzymywać ewentualne funkcje callback dla potwierdzenia zapisu lub przekierowania po zapisaniu.

### SourceTextForm (TextInputArea)

- Opis: Formularz wejściowy do uruchomienia generowania. Komponent umożliwiający wprowadzenie tekstu przez użytkownika.
- Główne elementy: `textarea` z licznikiem, `select` modelu (whitelist), `input[type=number]` dla temperature (0.0–2.0; krok 0.01), przycisk „Generuj”. Pole tekstowe (textarea) z placeholderem i etykietą.
- Obsługiwane interakcje: wpisywanie tekstu, wybór modelu, wprowadzanie temperature, submit. onChange do aktualizacji stanu wartości tekstu.
- Obsługiwana walidacja:
  - `sourceText`: po sanitizacji 1000–10000 znaków (spójne z backendem), liczenie code pointów.
  - `model`: z whitelisty zgodnej z backendem.
  - `temperature`: 0.0–2.0, max 2 miejsca po przecinku.
  - `maxFlashcards`: 1–15.
  - Prewencja 413: ostrzeż, gdy rozmiar JSON może przekroczyć 10 KB (heurystyka), ale ostatecznie polegaj na odpowiedzi 413.
    Sprawdzenie długości tekstu (1000 - 10000 znaków) na bieżąco.
- Typy: `GenerationFormState`, `CreateGenerationCommand` (z `src/types.ts`). Lokalny string state, typ `CreateGenerationCommand` przy wysyłce.
- Propsy:
  - `value: GenerationFormState`
  - `onChange(next: GenerationFormState)`
  - `onSubmit()`
  - `isSubmitting: boolean`
    value, onChange, placeholder.

### GenerationStatusPanel (SkeletonLoader and ErrorNotification)

- Opis: Pokazuje status „pending” (spinner/skeleton), ETA i licznik od uruchomienia, do 5 s. Informuje o błędach. Komponent wizualizacji ładowania danych (skeleton) i wyświetlania komunikatów o błędach.
- Główne elementy: spinner, pasek postępu, komunikaty. Szablon UI (skeleton) imitujący strukturę kart, które będą wyświetlone; komunikat tekstowy, ikona błędu.
- Obsługiwane interakcje: anulowanie (opcjonalne), retrial (opcjonalne) po błędzie. Brak interakcji użytkownika dla loadera.
- Obsługiwana walidacja: brak – prezentacja stanu. Przekazany komunikat nie powinien być pusty dla błędów.
- Typy: `GenerationProgressState`, `GenerationStatus`. Stateless dla loadera; String (wiadomość błędu) dla notification.
- Propsy: `status: GenerationStatus`, `progress: GenerationProgressState`, `error?: UiError`. Może przyjmować opcjonalne parametry stylizacyjne dla loadera; message, ewentualnie typ błędu dla notification.

### ProposalsSection (FlashcardList)

- Opis: Sekcja wyników z listą propozycji i narzędziami zbiorczymi. Komponent wyświetlający listę propozycji fiszek otrzymanych z API.
- Główne elementy: toolbar (licznik wybranych, przycisk „Zapisz zaakceptowane”, selekcja wszystkich/żadnych), lista kart. Lista (np. ul/li lub komponenty grid) zawierająca wiele ProposalCard.
- Obsługiwane interakcje: wybór/odznaczenie wszystkich, zapis zbiorczy. Przekazywanie zdarzeń do poszczególnych kart (akceptacja, edycja, odrzucenie).
- Walidacja: blokada zapisu, gdy 0 wybranych lub przekroczony limit dostępnych slotów. Brak – dane przychodzące z API są już zwalidowane.
- Typy: `EditableProposedFlashcard[]`, `CommitSelectionState`, `CommitGenerationCommand`. Tablica obiektów typu `EditableProposedFlashcard` (equivalent to FlashcardProposalViewModel).
- Propsy: `items`, `onToggleAll`, `onBulkSave`, `selectedCount`, `remainingSlots`. flashcards (lista propozycji), onAccept, onEdit, onReject.

### ProposalsList

- Opis: Renderuje listę `ProposalCard` w układzie siatki lub listy.
- Główne elementy: kontener, wirtualizacja (opcjonalnie – zwykle ≤15).
- Interakcje: przekazywane do kart.
- Walidacja: n/a.
- Typy: `EditableProposedFlashcard[]`.
- Propsy: `items`, `onItemChange`, `onItemAcceptToggle`, `onItemReject`, `onOpenEditor`.

### ProposalCard (FlashcardListItem)

- Opis: Pojedyncza propozycja – front/back z licznikami, przełącznik Akceptuj/Odrzuć, edycja inline lub otwarcie `EditProposalDialog`. Pojedyncza karta przedstawiająca jedną propozycję fiszki.
- Główne elementy: `Card` (shadcn/ui), pola `textarea`, liczniki znaków, przyciski Akceptuj/Odrzuć/Edytuj. Wyświetlenie tekstu dla przodu i tyłu fiszki oraz trzy przyciski: "Zatwierdź", "Edytuj", "Odrzuć".
- Obsługiwane interakcje: toggle akceptacji, edycja, odrzucenie. onClick dla każdego przycisku, który modyfikuje stan danej fiszki (np. oznaczenie jako zaakceptowana, otwarcie trybu edycji, usunięcie z listy).
- Walidacja:
  - `front` ≤200, `back` ≤500, minimalnie 10 znaków (spójne z endpointem manualnym, a przy commicie – walidacja po stronie UI identyczna).
  - Gdy treść zmieniona względem propozycji, oznacz `source` jako `ai-edited`, w przeciwnym razie `ai-full`.
    Jeśli edycja jest aktywna, wprowadzone dane muszą spełniać warunki: front ≤ 200 znaków, back ≤ 500 znaków.
- Typy: `EditableProposedFlashcard`. Rozszerzony typ `EditableProposedFlashcard`, lokalny model stanu, np. z flagą accepted/edited.
- Propsy: `item`, `onChange(item)`, `onAcceptToggle(id, accepted)`, `onReject(id)`, `onOpenEditor(id)`. flashcard (dane propozycji), onAccept, onEdit, onReject.

### EditProposalDialog (opcjonalnie)

- Opis: Modal do wygodnej edycji front/back z licznikami i walidacją.
- Główne elementy: `Dialog` (shadcn/ui), dwa `textarea`, liczniki, zapisz/anuluj.
- Interakcje: edycja i potwierdzenie zapisów w draftach karty.
- Walidacja: jak w `ProposalCard`.
- Typy: `EditableProposedFlashcard`.
- Propsy: `open`, `item`, `onClose()`, `onSave(next)`.

### ProposalsToolbar (BulkSaveButton)

- Opis: Działania zbiorcze nad propozycjami. Komponent zawiera przyciski umożliwiające zbiorczy zapis wszystkich wygenerowanych fiszek lub tylko tych, które zostały zaakceptowane.
- Główne elementy: licznik wybranych, przyciski „Zaznacz wszystko/wyczyść”, „Zapisz zaakceptowane”. Dwa przyciski: "Zapisz wszystkie" oraz "Zapisz zaakceptowane".
- Interakcje: selekcja wszystkich, commit. onClick dla każdego przycisku, który wywołuje odpowiednią funkcję wysyłającą żądanie do API.
- Walidacja: przycisk zapisu aktywny tylko, gdy `selectedCount > 0` i nie przekroczymy dostępnych slotów. Aktywowany jedynie gdy istnieją fiszki do zapisu; dane fiszek muszą spełniać walidację (front ≤ 200 znaków, back ≤ 500 znaków).
- Typy: `CommitGenerationCommand`, `CommitSelectionState`. Wykorzystuje typy zdefiniowane w `types.ts`, w tym interfejs `CommitGenerationCommand`.
- Propsy: `selectedCount`, `total`, `remainingSlots`, `onSelectAll()`, `onClear()`, `onCommit()`. onSaveAll, onSaveAccepted, disabled.

### ManualFlashcardForm (US-004)

- Opis: Prosty formularz dodania pojedynczej fiszki ręcznie.
- Główne elementy: dwa `textarea` z licznikami, przycisk „Dodaj fiszkę”.
- Interakcje: walidacja inline, submit do `/api/flashcards`.
- Walidacja: front [10, 200], back [10, 500]; komunikaty inline i dezaktywacja przy błędach.
- Typy: `CreateFlashcardCommand`, `CreateFlashcardResponseDto`.
- Propsy: `onCreated(flashcard)`, `remainingSlots`.

## 5. Typy

Nowe typy ViewModel oraz interfejsy propów (wycinek – najważniejsze):

```ts
// Widok – statusy i błąd UI
export type GenerationStatus = "idle" | "submitting" | "pending" | "ready" | "failed" | "committing" | "committed";

export interface UiError {
  code: string;
  message: string;
  details?: readonly unknown[];
}

// Formularz generowania
export interface GenerationFormState {
  sourceText: string;
  model?: string; // z whitelisty
  temperature?: number; // 0.0–2.0 (max 2 miejsca po przecinku)
  maxFlashcards: number; // 1–15
}

// Postęp wizualny
export interface GenerationProgressState {
  startedAt?: number; // ms
  deadlineAt?: number; // ms (startedAt + 5000)
}

// Propozycja z draftem edycji i wyborem
export interface EditableProposedFlashcard {
  proposalId: string;
  frontOriginal: string;
  backOriginal: string;
  frontDraft: string; // edytowalne
  backDraft: string; // edytowalne
  accepted: boolean; // do zbiorczego commit
  edited: boolean; // pochodna (front/back różni się od original)
  validation?: {
    front?: string; // komunikat błędu
    back?: string;
  };
}

// Zbiorczy wybór i ograniczenia
export interface CommitSelectionState {
  selectedCount: number;
  remainingSlots: number; // 15 - currentUserFlashcards
}
```

Powiązania z istniejącymi DTO (`src/types.ts`):

- Start: `CreateGenerationCommand`, `CreateGenerationResponseDto.generation` (zawiera `id`, `status: pending`, `sourceTextLength`, `maxFlashcards`, `createdAt`, `expiresAt`).
- Polling: oczekiwany `GenerationDetailDto` (z `proposedFlashcards: ProposedFlashcardDto[]`, `status`, `durationMs`, `metrics`).
- Commit: `CommitGenerationCommand` (lista `GenerationCommitAction`), odpowiedź `CommitGenerationResultDto` (z `accepted: FlashcardDto[]`, `summary`, `metrics`).
- Manual: `CreateFlashcardCommand`, `CreateFlashcardResponseDto`.

- **CreateGenerationCommand**: { sourceText: string, model?: string, temperature?: number, maxFlashcards: number } – wysyłany do endpointu `/api/ai-generations` (extended from course's GenerateFlashcardsCommand).
- **CreateGenerationResponseDto**: { generation: { id: string, status: 'pending', ... }, ... } – struktura odpowiedzi z API (adapted from course's GenerationCreateResponseDto).
- **ProposedFlashcardDto**: { proposalId: string, front: string, back: string, source: "ai-full" } – pojedyncza propozycja fiszki (equivalent to FlashcardProposalDto).
- **ProposedFlashcardDto**: { proposalId: string, front: string, back: string, source?: "ai-full" | "ai-edited", metadata?: Record<string, unknown> } – pojedyncza propozycja fiszki (equivalent to FlashcardProposalDto; `source` może być pominięte – przyjmuj domyślnie "ai-full" w UI).
- **EditableProposedFlashcard**: { proposalId: string, frontOriginal: string, backOriginal: string, frontDraft: string, backDraft: string, accepted: boolean, edited: boolean, ... } – rozszerzony model reprezentujący stan propozycji fiszki, umożliwiający dynamiczne ustawienie pola source podczas wysyłania danych do endpointu (equivalent to FlashcardProposalViewModel).
- **CommitGenerationCommand**: { flashcards: GenerationCommitAction[], ... } – obiekt wysyłany do endpointu `/api/ai-generations/:id/commit` zawierający tablicę akcji fiszek (każda fiszka musi mieć front ≤200 znaków, back ≤500 znaków, odpowiedni source) i umożliwia zapisanie danych do bazy (adapted from course's FlashcardsCreateCommand).

- Statusy API vs FE: API `AiGenerationStatus` zwraca `pending | succeeded | failed`; na FE `GenerationStatus` używa `ready` jako odpowiednika `succeeded`.

## 6. Zarządzanie stanem

- Główny stan w `GenerateView` + dedykowany hook `useAiGeneration` w `src/lib/hooks/useAiGeneration.ts`.
- `useAiGeneration` – odpowiedzialności:
  - `startGeneration(form: GenerationFormState)`: POST `/api/ai-generations`, ustaw `status=submitting` → po 202 `pending` i uruchom polling.
  - Polling co 800 ms do 5 s (twardy limit). Wstrzymaj po `ready|failed` lub przekroczeniu limitu; obsłuż `expiresAt` tylko informacyjnie.
  - Transformacja `ProposedFlashcardDto[]` → `EditableProposedFlashcard[]` (kopie `front/back` do draftów).
  - `toggleAccept(proposalId)`, `editDraft(proposalId, next)`, walidacja front/back (10–200/10–500), aktualizacja `edited` oraz błędów.
  - `commitSelected()`: buduje `CommitGenerationCommand.flashcards`:
    - dla zaakceptowanych: `action: "accept"`, `proposalId`, `front`, `back` (z draftów); źródło po stronie API zostanie rozróżnione na `ai-full` vs `ai-edited` (na FE: oznaczamy to w analityce UI; do API nie wysyłamy `source`).
    - odrzucone można pominąć albo wysłać `action: "reject"` jeśli API tego wymaga (w planie przyjmujemy, że odrzucone nie muszą być wysyłane – można skonfigurować pod endpoint docelowy).
  - Obsługa limitu slotów: policz `remainingSlots = 15 - currentUserFlashcards`; przy commicie zablokuj wybór > `remainingSlots` lub pokaż ostrzeżenie (worker i tak przytnie – zgodnie z backendem).
- Lokalny stan formularza manualnego niezależny.

Stan widoku będzie zarządzany za pomocą hooków React (useState, useEffect). Kluczowe stany:

- Wartość pola tekstowego (sourceText w GenerationFormState).
- Stan ładowania (isLoading) dla wywołania API i pollingu.
- Stan błędów (errorMessage) dla komunikatów o błędach.
- Lista propozycji fiszek (EditableProposedFlashcard[]), wraz z ich lokalnymi flagami (np. accepted, edited).
- Opcjonalny stan dla trybu edycji fiszki.
  Koniecznie wydzielić logikę API do customowego hooka (np. useAiGeneration) do obsługi logiki API.

## 7. Integracja API

- Ścieżki (Astro):
  - Start generowania: `POST /api/ai-generations` – body: `CreateGenerationCommand`.
    - Zwrot: 202 z `{ generation: GenerationSummaryDto }`.
    - Błędy: 400/401/409/413/422/500 (komunikaty z `ApiErrorResponse`).
  - Polling szczegółów: `GET /api/ai-generations/:id` – oczekiwany `GenerationDetailDto` (status `pending|succeeded|failed`).
    - Uwaga: endpoint do implementacji po stronie backendu, FE zakłada jego istnienie (typy już są w `src/types.ts`).
  - Commit: `POST /api/ai-generations/:id/commit` – body: `CommitGenerationCommand` (zaakceptowane pozycje). Zwrot: `CommitGenerationResultDto`.
    - Uwaga: endpoint do implementacji po stronie backendu.
  - Manualna fiszka: `POST /api/flashcards` – body: `CreateFlashcardCommand { front, back, source?: "manual" }`.
  - Zwrot: 201 z `{ flashcard: CreateFlashcardResponseDto }`; Błędy: 401/422 (code: `VALIDATION_ERROR`)/409 (`FLASHCARD_DUPLICATE`, `FLASHCARD_LIMIT_REACHED`)/500.

- Klient HTTP (FE): `src/lib/api/aiGenerationsClient.ts`:

```ts
export async function postCreateGeneration(payload: CreateGenerationCommand): Promise<CreateGenerationResponseDto> {
  /* fetch('/api/ai-generations') */
}
export async function getGenerationDetail(id: string): Promise<GenerationDetailDto> {
  /* fetch(`/api/ai-generations/${id}`) */
}
export async function postCommitGeneration(
  id: string,
  cmd: CommitGenerationCommand
): Promise<CommitGenerationResultDto> {
  /* fetch */
}
export async function postCreateManualFlashcard(
  cmd: CreateFlashcardCommand
): Promise<{ flashcard: CreateFlashcardResponseDto }> {
  /* fetch('/api/flashcards') */
}
```

Integracja z endpointem:

- **POST /api/ai-generations**: Wysyłamy obiekt `CreateGenerationCommand` { sourceText, model, temperature, maxFlashcards } i otrzymujemy odpowiedź zawierającą generation id, status pending itp. (adapted from course's POST /generations).
- **GET /api/ai-generations/:id**: Polling dla szczegółów generacji z propozycjami.
- **POST /api/ai-generations/:id/commit**: Po zaznaczeniu fiszek do zapisu, wysyłamy żądanie z `CommitGenerationCommand`, który zawiera tablicę akcji fiszek (każda fiszka musi mieć front ≤200 znaków, back ≤500 znaków, odpowiedni source) i umożliwia zapisanie danych do bazy (adapted from course's POST /flashcards).
- **POST /api/ai-generations/:id/commit**: Po zaznaczeniu fiszek do zapisu, wysyłamy żądanie z `CommitGenerationCommand`, który zawiera tablicę akcji typu `GenerationCommitAction` (dla zaakceptowanych: `action: "accept"`, `proposalId`, `front`, `back`; opcjonalnie dla odrzuconych: `action: "reject"`). Backend rozstrzyga finalne `source` na podstawie treści.
- Walidacja odpowiedzi: sprawdzenie statusu HTTP, obsługa błędów 400 (walidacja) oraz 500 (błąd serwera).

## 8. Interakcje użytkownika

- Wklejenie tekstu → licznik znaków pokazuje „X / 10000”, validacja od 1000.
- Wybranie modelu i temperature (opcjonalne) → walidacja zakresu i precyzji (2 miejsca).
- Klik „Generuj” → status „pending”, spinner i pasek postępu (do 5 s). Blokada formularza w trakcie.
- Po sukcesie: render listy propozycji, domyślnie odznaczone (albo opcjonalnie zaznaczone wszystkie – decyzja produktowa; w MVP sugerowane: ręczny wybór przez użytkownika).
- Użytkownik edytuje front/back (inline lub w dialogu) → liczniki i walidacje na bieżąco; zmiana treści ustawia `edited=true`.
- Użytkownik zaznacza do akceptacji i uruchamia „Zapisz zaakceptowane” → commit, wynik: licznik zapisanych, komunikat sukcesu, link do „Moje fiszki”.
- Sekcja manualna: tworzenie pojedynczej fiszki (walidacje, komunikat przy 409 lub 422).

- Użytkownik wkleja tekst do pola tekstowego.
- Po kliknięciu przycisku "Generuj fiszki":
  - Rozpoczyna się walidacja długości tekstu.
  - Jeśli walidacja przejdzie, wysyłane jest żądanie do API.
  - Podczas oczekiwania wyświetlany jest SkeletonLoader oraz przycisk jest dezaktywowany.
- Po otrzymaniu odpowiedzi wyświetlana jest lista ProposalCard.
- Każda karta umożliwia:
  - Zatwierdzenie propozycji, która oznacza fiszkę do zapisu.
  - Edycję – otwarcie trybu edycji z możliwością korekty tekstu z walidacją.
  - Odrzucenie – usunięcie propozycji z listy.
- Komponent `ProposalsToolbar` umożliwi wysłanie wybranych fiszek do zapisania w bazie (wywołanie API POST /api/ai-generations/:id/commit).

## 9. Warunki i walidacja

- Formularz generowania:
  - `sourceText` (po sanitizacji): 1000–10000 code pointów; usuń znaki kontrolne; znormalizuj białe znaki (analogicznie do backendu).
  - `model`: jeden z: `openrouter/anthropic/claude-3.5-sonnet`, `openrouter/openai/gpt-4o`, `openrouter/openai/gpt-4o-mini`, `openrouter/google/gemini-pro-1.5` (zgodnie z backendowym defaultem; finalnie można pobrać z env/API).
  - `temperature`: 0.0–2.0, max 2 miejsca po przecinku.
  - `maxFlashcards`: 1–15.
- Propozycje/commit:
  - `front`: 10–200; `back`: 10–500; komunikaty inline i dezaktywacja przy błędach.
  - `ai-full` vs `ai-edited`: po stronie FE rozróżniane przez `edited`, informacyjnie; API rozstrzyga finalne `source` przy zapisie.
  - Limit 15: oblicz `remainingSlots` i nie pozwól zaznaczyć więcej niż dostępne miejsca (lub ostrzeżenie o przycięciu przez backend; trzymamy się MVP: blokada wyboru > `remainingSlots`).
- Manualne dodanie: te same zakresy znaków, unikalność `front` po stronie bazy (obsłuż 409 UI).

- Pole tekstowe: długość tekstu musi wynosić od 1000 do 10000 znaków.
- Podczas edycji fiszki: front ≤ 200 znaków, back ≤ 500 znaków.
- Przycisk generowania aktywowany tylko przy poprawnym walidowanym tekście.
- Walidacja odpowiedzi API: komunikaty błędów wyświetlane w ErrorNotification.

## 10. Obsługa błędów

- 401 UNAUTHORIZED: pokaż baner „Zaloguj się, aby generować fiszki” + CTA do logowania.
- 400 INVALID_CONTENT_TYPE/INVALID_JSON: nie powinno wystąpić przy naszym fetch – ogólny komunikat.
- 413 PAYLOAD_TOO_LARGE: komunikat „Żądanie przekracza 10 KB – skróć tekst lub podziel na części”.
- 422 SCHEMA_VALIDATION_FAILED: mapuj `issues[]` do pól (`sourceText`, `model`, `temperature`, `maxFlashcards`), wyświetlaj inline.
- 409 GENERATION_PENDING: komunikat „Masz już trwające generowanie – poczekaj na wynik”.
- 409 FLASHCARD_LIMIT_REACHED (start/commit/manual): baner „Limit 15 fiszek – usuń część przed dodaniem nowych”.
- 409 FLASHCARD_DUPLICATE (manual): duplikat `front`.
- 422 VALIDATION_ERROR (manual): błędy walidacji `front/back`.
- 500 INTERNAL_ERROR: baner z możliwością ponowienia.

- Wyświetlanie komunikatów o błędach w przypadku niepowodzenia walidacji formularza.
- Obsługa błędów API (status 400 i 500): wyświetlenie odpowiednich komunikatów i możliwość ponownego wysłania żądania.
- W przypadku niepowodzenia zapisu fiszek, stan ładowania jest resetowany, a użytkownik informowany o błędzie.

## 11. Kroki implementacji

1. Utworzenie nowej strony widoku `/generate` w strukturze Astro.
2. Implementacja głównego komponentu `GenerateView`.
3. Stworzenie komponentu `SourceTextForm` z walidacją długości tekstu.
4. Stworzenie komponentu `GenerateButton` i podpięcie akcji wysyłania żądania do POST /api/ai-generations.
5. Implementacja hooka (np. useAiGeneration) do obsługi logiki API i zarządzania stanem.
6. Utworzenie komponentu `GenerationStatusPanel` do wizualizacji ładowania.
7. Stworzenie komponentów `ProposalsSection` i `ProposalCard` z obsługą akcji (zatwierdzanie, edycja, odrzucenie).
8. Integracja wyświetlania komunikatów błędów przez `GenerationStatusPanel`.
9. Implementacja komponentu `ProposalsToolbar`, który będzie zbiorczo wysyłał żądanie do endpointu POST /api/ai-generations/:id/commit, korzystając z typu `CommitGenerationCommand` do walidacji danych.
10. Testowanie interakcji użytkownika oraz walidacji (scenariusze poprawne i błędne).
11. Dostrojenie responsywności i poprawienie aspektów dostępności.
12. Finalny code review i refaktoryzacja przed wdrożeniem.

---

Uwagi implementacyjne:

- Endpointy polling/commit są zakładane po stronie backendu (typy już istnieją w `src/types.ts`). FE powinien użyć tych typów i przygotować się na ich dostępność pod `/api/ai-generations/:id` oraz `/api/ai-generations/:id/commit`.
- Limit 15: backend już wymusza wstawianie i zgłasza 409; FE powinien uprzedzać i komunikować, a przy commicie – ograniczać wybór do `remainingSlots`.
- Różnicowanie `ai-full`/`ai-edited` realizujemy na FE tylko do celów UI; ostateczny zapis i metryki będą naliczane w backendzie na podstawie treści i oryginału.

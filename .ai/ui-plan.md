# Architektura UI dla AI Flashcard Generator

## 1. Przegląd struktury UI

- Desktop‑only (brak responsywności w MVP).
- Ochrona tras w middleware: prywatne widoki wymagają sesji; 401 → redirect do `/login`.
- Technologia: Astro 5 (layout i strony), React 19 (interaktywne widoki), TypeScript 5, Tailwind 4, Shadcn/ui.
- Formularze: zod + kontrolowane komponenty; spójne komunikaty walidacji (422 inline przy polach).
- Stan i dane: TanStack Query (klucze domenowe, invalidacje po mutacjach; brak optimistic dla commit/review).
- Obsługa błędów: 409 (limity/duplikaty/stany równoległe), 413 (payload), 422 (walidacja), 401 (redirect), 404 (not found). Toast dla 5xx.
- A11y: etykiety/aria dla pól, focus management w Dialog/AlertDialog, klawiszologia dla krytycznych akcji.
- Trasy: `/login`, `/signup`, `/`, `/generate`, `/generations`, `/generations/:id`, `/study`, `/settings`.
 - Modele AI (Select): opcje pochodzą z whitelisty `OPENROUTER_ALLOWED_MODELS` (env) lub domyślnej listy w validatorze.
 - Limit payload dla POST `/api/ai-generations`: 10 KB → 413 (czytelny komunikat w UI).

## 2. Lista widoków

- Nazwa widoku: Logowanie
  - Ścieżka widoku: `/login`
  - Główny cel: Uwierzytelnienie użytkownika (email/hasło) i wejście do aplikacji.
  - Kluczowe informacje do wyświetlenia: Pola email/hasło, błędy logowania, link do rejestracji.
  - Kluczowe komponenty widoku: Form (email, password), Button „Zaloguj się”, Link „Załóż konto”, Alert błędu.
  - UX, dostępność i względy bezpieczeństwa: Walidacja formatu email, komunikaty 401/422, zapobieganie enumeracji kont; fokus na pierwszym polu, submit Enter.

- Nazwa widoku: Rejestracja
  - Ścieżka widoku: `/signup`
  - Główny cel: Założenie konta (email/hasło) i automatyczne zalogowanie.
  - Kluczowe informacje do wyświetlenia: Pola email/hasło, wymagania siły hasła, link do logowania.
  - Kluczowe komponenty widoku: Form (email, password), Password strength hint, Button „Utwórz konto”, Link „Masz konto? Zaloguj się”.
  - UX, dostępność i względy bezpieczeństwa: Walidacja siły hasła, czytelne błędy; po sukcesie redirect do `/`.

- Nazwa widoku: Moje fiszki
  - Ścieżka widoku: `/`
  - Główny cel: Przegląd, tworzenie, edycja i usuwanie fiszek użytkownika (limit 15, unikalny front).
  - Kluczowe informacje do wyświetlenia: Lista fiszek (front/back, source, timestamps), licznik „x/15”, paginacja; opcjonalnie filtr/search.
  - Kluczowe komponenty widoku: Lista/siatka fiszek, Paginacja, Form dodawania (front 10–200, back 10–500), Dialog edycji, AlertDialog usunięcia, Badge „source”.
  - UX, dostępność i względy bezpieczeństwa: Błędy 409 (limit/duplikat) i 422 inline; dostępne przyciski Edytuj/Usuń; confirm przed usunięciem; soft‑limit copy przy 15/15.

- Nazwa widoku: Generowanie fiszek (AI)
  - Ścieżka widoku: `/generate`
  - Główny cel: Wklejenie tekstu (1000–10000 znaków), uruchomienie generowania i przegląd/akceptacja/edycja/odrzucanie propozycji.
  - Kluczowe informacje do wyświetlenia: Textarea z licznikami znaków, stan generacji (pending ≤5 s), lista propozycji, licznik wybranych do zapisu.
  - Kluczowe komponenty widoku: Textarea źródła, Select model (z whitelisty)/temperature (0.0–2.0; maks. 2 miejsca po przecinku) — opcjonalnie, Button „Generuj”, Skeleton/Spinner, Karta propozycji (front/back, edycja inline lub w Dialog), Toolbar zbiorczego commit („Zapisz zaakceptowane”).
  - UX, dostępność i względy bezpieczeństwa: Polling 800 ms do 5 s; 413 przy payload >10 KB lub zbyt długim tekście; walidacja 422 (komunikaty inline przy polach); prewencja przekroczenia limitu 15 (blokada lub wyraźne komunikaty); rozróżnienie `ai-full` vs `ai-edited` po zmianach.

- Nazwa widoku: Historia generacji
  - Ścieżka widoku: `/generations`
  - Główny cel: Przegląd historii generacji z metrykami i statusem.
  - Kluczowe informacje do wyświetlenia: Tabela (status, model, createdAt, duration, generated/accepted/rejected), link do szczegółu.
  - Kluczowe komponenty widoku: Tabela z paginacją/sortem (createdAt:desc), Status badge, Link do `/generations/:id`.
  - UX, dostępność i względy bezpieczeństwa: Czytelne stany; filtrowanie po statusie w kolejnych iteracjach; brak danych → pusty stan z CTA do „Generuj”.

- Nazwa widoku: Szczegóły generacji
  - Ścieżka widoku: `/generations/:id`
  - Główny cel: Podgląd statusu i propozycji danej generacji; po commicie widok read‑only.
  - Kluczowe informacje do wyświetlenia: Status, czas, metryki (generated/accepted_unedited/accepted_edited/rejected), hash źródła, lista propozycji.
  - Kluczowe komponenty widoku: Karta statusu, Lista propozycji (read‑only po commicie), Empty/pending states, przycisk odśwież.
  - UX, dostępność i względy bezpieczeństwa: Gdy pending >5 s → komunikat o oczekiwaniu i przycisk ręcznego odświeżenia; brak możliwości commitu z tego widoku po zakończeniu.

- Nazwa widoku: Sesja nauki
  - Ścieżka widoku: `/study`
  - Główny cel: Rozpoczęcie sesji, sekwencja „pokaż odpowiedź” → ocena (again/hard/good/easy), przechodzenie przez kolejkę.
  - Kluczowe informacje do wyświetlenia: Aktualna fiszka (front → back po ujawnieniu), postęp sesji, ostatnia ocena.
  - Kluczowe komponenty widoku: Karta nauki (front/back, przycisk „Pokaż odpowiedź”), 4 przyciski ocen, Pasek postępu, Snackbar wyników oceny.
  - UX, dostępność i względy bezpieczeństwa: Klawiszologia (Spacja: reveal; 1–4: oceny), blokada ocen przed reveal; 409 aktywna sesja → możliwość wznowienia; minimalny rozpraszacz UI.

- Nazwa widoku: Ustawienia konta
  - Ścieżka widoku: `/settings`
  - Główny cel: Podgląd/edycja profilu (`displayName`, `timeZone`, `marketingOptIn`) oraz trwałe usunięcie konta.
  - Kluczowe informacje do wyświetlenia: Formularz profilu, lista stref czasowych (IANA lub input), sekcja „Usuń konto”.
  - Kluczowe komponenty widoku: Form z walidacją, Select timeZone, Switch marketing, Button „Zapisz”, AlertDialog „Usuń konto”.
  - UX, dostępność i względy bezpieczeństwa: 401 → redirect; DELETE wymaga potwierdzenia tekstowego; po usunięciu konta — wylogowanie i czyszczenie stanu lokalnego.

## 3. Mapa podróży użytkownika

- Ścieżka główna (AI → nauka):
  1) `/signup` → sukces → `/`
  2) Z nagłówka → „Generuj” → `/generate`
  3) Wklejenie tekstu → „Generuj” → pending (≤5 s) → propozycje
  4) Przejrzyj/Edytuj/Odrzuć → „Zapisz zaakceptowane” (commit)
  5) Redirect/CTA do `/` → weryfikacja zapisanych fiszek (licznik „x/15”)
  6) „Rozpocznij naukę” → `/study` → reveal → ocena → następna fiszka

- Ścieżka manualna: `/` → Dodaj fiszkę → Edytuj/Usuń w miejscu.

- Historia i szczegóły: `/generations` → wybór → `/generations/:id` (podgląd metryk/propozycji).

- Ustawienia i bezpieczeństwo: `/settings` → edycja profilu → ewentualnie „Usuń konto” → wylogowanie.

- Mapowanie historyjek PRD (wybrane):
  - US‑001/002: `/signup`, `/login` (uwierzytelnianie, komunikaty błędów, redirect).
  - US‑003/011: `/generate`, `/generations/:id` (generacja, przegląd propozycji, commit).
  - US‑004/005/006/007/009: `/` (CRUD fiszek, walidacje, limit 15, potwierdzenia).
  - US‑008: `/study` (reveal, 4‑przyciskowa ocena, sekwencja).
  - US‑010: middleware + RLS (izolacja danych; w UI — brak dostępu do cudzych zasobów).
  - US‑012: `/settings` (DELETE konta i dane; wylogowanie).

## 4. Układ i struktura nawigacji

- Layouty:
  - AuthLayout (dla `/login`, `/signup`): minimalistyczny, bez nawigacji aplikacyjnej.
  - AppLayout (dla widoków prywatnych): nagłówek z nawigacją, kontener treści, miejsce na Toast.

- Nagłówek (po zalogowaniu):
  - Linki: „Moje fiszki” (`/`), „Generuj” (`/generate`), „Generacje” (`/generations`), „Nauka” (`/study`), „Ustawienia” (`/settings`).
  - Sekcja konta: avatar/menu (Wyloguj, skróty).
  - Responsywność (po MVP): nagłówek przekształca się w menu hamburger w widoku mobilnym.

- Routowanie i ochrona:
  - Middleware sprawdza sesję; brak sesji → redirect do `/login`.
  - 404: prosty widok „Nie znaleziono” z linkiem powrotnym.

- Stany ładowania/błędów:
  - Skeleton/Spinner w kluczowych miejscach (propozycje AI, tabele, szczegóły generacji).
  - Błędy 422 pod polami; 409/413/5xx jako Toast z możliwością zamknięcia klawiaturą.

## 5. Kluczowe komponenty

- Layout i nawigacja: AppLayout, AuthLayout, NavBar, PageHeader, Breadcrumbs (opcjonalnie).
- Formularze i UI: Input, Textarea z licznikami, Button, Select, Switch, FormField z walidacją, Tooltip, Badge, Toast.
- Dialogi: Dialog (edycja fiszki, edycja propozycji), AlertDialog (usuwanie fiszki, usuwanie konta).
- Listy i tabele: FlashcardsList, FlashcardItem, PaginatedTable (generacje), PaginationControls, EmptyState.
- Generowanie AI: SourceInput, GenerationStatusBar, ProposalCard (z akcjami Akceptuj/Edytuj/Odrzuć), CommitBar (zliczanie i zapis zaakceptowanych).
- Nauka: StudyCard (front/back, reveal), StudyActions (again/hard/good/easy), ProgressBar, SessionSummary.
- Ustawienia: ProfileForm (displayName, timeZone, marketingOptIn), DeleteAccountSection.
- Integracja danych: query hooks (np. `useFlashcards`, `useGenerations`, `useGeneration`, `useStudySession`, `useMe`) z kluczami i invalidacjami zgodnie z przepływami.



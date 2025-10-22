# API Endpoint Implementation Plan: POST /api/ai-generations

## 1. Przegląd punktu końcowego

- Cel: uruchomienie procesu generowania fiszek przez AI dla zalogowanego użytkownika przy zachowaniu limitów długości tekstu i kwot fiszek.
- Efekt: utworzenie wpisu w `app.ai_generation_logs` w stanie `pending`, obliczenie metadanych (hash, długość, parametry modelu) oraz delegacja właściwej pracy do kolejki zadań.
- Odbiorcy: widok `/generate` oraz inne klienty wymagające zainicjowania generacji AI.

## 2. Szczegóły żądania

- Metoda / URL: `POST /api/ai-generations`
- Nagłówki: `Content-Type: application/json`, `Authorization: Bearer <jwt>` lub aktywna sesja Supabase; `Accept: application/json`.
- Body (`CreateGenerationCommand`):
  - `sourceText` _(string, required)_ – tekst 1000–10000 znaków po `trim()`.
  - `maxFlashcards` _(number, required)_ – zakres 1–15; musi być ≤ limit triggera `app.flashcards_before_insert_limit`.
  - `model` _(string, optional)_ – wpis z allowlisty (np. `import.meta.env.OPENROUTER_ALLOWED_MODELS`).
  - `temperature` _(number, optional)_ – zakres 0.0–2.0, zaokrąglony do dwóch miejsc.
- Walidacja (Zod):
  - Pre-trimowanie `sourceText`, kontrola długości oraz zgodność `sourceTextLength = char_length(sourceText)`.
  - `maxFlashcards` z walidacją typów, wartości dodatnich i limitu globalnego.
  - `model` sprawdzany na podstawie konfiguracji; brak → zastosowanie modelu domyślnego.
  - `temperature` przycięta do zakresu oraz default (np. 0.8) kiedy nie podano.
  - Kontrola braku równoległej generacji w statusie `pending` dla użytkownika (walidacja biznesowa przed insertem).

## 3. Szczegóły odpowiedzi

- Sukces: `202 Accepted` + `Cache-Control: no-store`.
- Payload (`CreateGenerationResponseDto`):
  - `generation: GenerationSummaryDto`, gdzie
    - `id` – UUID wpisu w `app.ai_generation_logs`.
    - `status` – zawsze `"pending"` przy tworzeniu.
    - `sourceTextLength` – liczba znaków po walidacji.
    - `maxFlashcards` – przyjęty limit.
    - `createdAt` – znacznik czasu z DB.
    - `expiresAt` – wyliczony `createdAt + ttl` (np. 5 minut) prezentowany jako ISO string.
- Wspierane DTO i typy: `CreateGenerationCommand`, `CreateGenerationResponseDto`, `GenerationSummaryDto`, `AiGenerationStatus`, `AiGenerationMetricsDto` (do późniejszego uzupełnienia).

## 4. Przepływ danych

1. Middleware uwierzytelnia żądanie i udostępnia `locals.supabase` (`SupabaseClient` powiązany z użytkownikiem).
2. Handler odczytuje body, waliduje schematem Zod i mapuje do `CreateGenerationCommand` (błędy → `ApiErrorResponse`).
3. Serwis `aiGenerationsService.createGeneration` wykonuje sekwencję:
   - `assertNoPendingGeneration(userId)` – zapytanie na `app.ai_generation_logs` z blokadą (`select ... for update skip locked`) lub unikatowym warunkiem biznesowym; w przypadku kolizji → błąd `409`.
   - `computeSourceTextHash(sourceText)` – SHA-256 (Node `crypto`) dla późniejszego deduplikowania.
   - Przygotowanie rekordu do inserta: ustawienie `status='pending'`, `generated_count=0`, `proposed_flashcards='[]'`, zapis `model`, `temperature`, `source_text`, `source_text_length`, `source_text_hash`.
   - Wstawienie danych przez `locals.supabase.from('app.ai_generation_logs').insert(...).select().single()` w ramach transakcji.
4. Serwis publikuje zadanie asynchroniczne `enqueueGenerationJob` (kontekst: `generationId`, `userId`, parametry modelu, `maxFlashcards`) – integracja z istniejącym workerem lub dodanie nowego modułu w `src/lib/jobs`.
5. Serwis mapuje rezultat do `GenerationSummaryDto`, obliczając `expiresAt` (konfiguracja TTL w jednym miejscu, np. `const GENERATION_TTL_MINUTES = 5`).
6. Handler zwraca `202` z danymi; w razie wyjątków po insercie aktualizuje rekord (`status='failed'`, `error_message`) i opcjonalnie pisze log do `app.ai_generation_error_logs`.

## 5. Względy bezpieczeństwa

- Autoryzacja: wymagane JWT Supabase; korzystać wyłącznie z `locals.supabase` zapewniającego stosowanie RLS.
- Walidacja: rygorystyczne schematy Zod, w tym allowlista modeli i zakres temperatury.
- Prywatność: nigdy nie logować treści `sourceText`; w logach i tabelach diagnostycznych przechowywać tylko hash i długość.
- Rate limiting: endpoint podlega globalnemu ograniczeniu (~60 req/min) z middleware; rozważyć dodatkowy per-user limit generacji AI.
- Ochrona kosztów: enforce single pending generation oraz `maxFlashcards ≤ 15` by nie łamać limitów triggera i budżetu AI.
- Konfiguracja: wartości takie jak allowlista modeli, TTL czy limit kolejki w `import.meta.env` / dedykowanych modułach konfiguracyjnych.

## 6. Obsługa błędów

- `400 Bad Request` – naruszenia walidacji ogólnej (pola puste, długość <1000, maxFlashcards = 0); zwracać `error.code = "VALIDATION_ERROR"` oraz listę szczegółów.
- `401 Unauthorized` – brak sesji; generowane przez middleware lub ręczny check (`locals.session`).
- `409 Conflict` – aktywna generacja w stanie `pending`; `error.code = "GENERATION_PENDING"`.
- `413 Payload Too Large` – body > określonego limitu (konfiguracja Astro); `error.code = "PAYLOAD_TOO_LARGE"`.
- `422 Unprocessable Entity` – `model` niedozwolony, temperatura poza zakresem, `maxFlashcards > 15`; `error.code = "SCHEMA_VALIDATION_FAILED"`.
- `500 Internal Server Error` – błędy DB, kolejki, hashingu; aktualizować wpis w logach (`app.ai_generation_error_logs`) z `error_code` (np. `INTERNAL_ERROR`), długością i hashem tekstu, a odpowiedź maskować przyjaznym komunikatem.
- Wszystkie odpowiedzi błędów używają `ApiErrorResponse` i `Cache-Control: no-store`.

## 7. Wydajność

- Hashowanie w serwisie umożliwia deduplikację i analizę bez przechowywania pełnego tekstu.
- Krótka transakcja tylko na wstawianie rekordu; operacje AI wykonuje worker poza requestem → brak blokady pętli eventowej.
- Wyszukiwanie pending generacji korzysta z indeksu `app_ai_generation_logs_user_id_created_at_idx` (zapytanie zawiera `status='pending'`).
- Ograniczenie rozmiaru kolejki: konfiguracja workerów (np. maksymalna liczba zadań w locie) i mechanizmu retry, aby uniknąć zaległości.
- Monitorowanie czasu trwania: worker uzupełnia `duration_ms`, co zasila metryki KPI (`GET /admin/ai-metrics`).

## 8. Kroki implementacji

1. Przygotować moduł konfiguracyjny (np. `src/lib/config/ai.ts`) definiujący domyślny model, allowlistę i TTL.
2. Zdefiniować schemat Zod (`createGenerationSchema`) w `src/lib/validation/aiGenerationSchemas.ts` wraz z testami jednostkowymi.
3. Utworzyć/rozszerzyć `src/lib/services/aiGenerationsService.ts` o funkcję `createGeneration` obejmującą walidację biznesową, insert oraz enqueue.
4. Dodać helper `computeSourceTextHash` w `src/lib/crypto/hash.ts` (testy: długość, deterministyczność, Unicode).
5. Zaimplementować `assertNoPendingGeneration` (z zapytaniem po indeksie i blokadą) oraz dedykowane wyjątki domenowe (`GenerationPendingError`).
6. Rozszerzyć infrastrukturę kolejki (`src/lib/jobs/queue.ts` lub nowy moduł) o zadanie `queueGenerationJob` z testem integracyjnym.
7. Zaimplementować handler Astro w `src/pages/api/ai-generations/index.ts`: pobranie sesji, walidacja, wywołanie serwisu, mapowanie odpowiedzi, error handling.
8. Dodać warstwę mapowania wyjątków → `ApiErrorResponse` (np. `mapGenerationErrorToHttp` w `src/lib/http/errors.ts`).
9. Zapisać log błędów (`app.ai_generation_error_logs`) w przypadku wyjątków serwisu; zapewnić test pokrywający ten scenariusz.
10. Dodać testy jednostkowe (serwis, mapper błędów) oraz test e2e endpointu (mock supabase + mock kolejki).
11. Zaktualizować dokumentację `.ai/api-plan.md` (sekcja POST `/ai-generations`) i changelog projektu.
12. Zweryfikować manualnie z frontem `/generate` (scenariusze sukcesu, równoległa próba, błędy walidacji, brak sesji).

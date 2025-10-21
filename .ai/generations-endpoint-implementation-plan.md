# API Endpoint Implementation Plan: POST /api/ai-generations

## 1. Przegląd punktu końcowego
Endpoint przyjmuje tekst źródłowy od zalogowanego użytkownika i inicjuje asynchroniczną generację propozycji fiszek AI. Tworzy rekord w `app.ai_generation_logs` ze statusem `pending`, wylicza hash treści i deleguje dalsze przetwarzanie do warstwy workerów. Odpowiada statusem 202 Accepted z metadanymi zadania oraz przewidywaną datą wygaśnięcia.

## 2. Szczegóły żądania
- Metoda HTTP: POST
- Struktura URL: `/api/ai-generations`
- Parametry:
  - Wymagane (body):
    - `sourceText` – string (1000–10000 znaków po trim), treść wejściowa do generacji
    - `maxFlashcards` – integer 1–15 wskazujący maksymalną liczbę fiszek do zaproponowania (przekazywany dalej do workerów)
  - Opcjonalne (body):
    - `model` – string identyfikujący model OpenRouter (`openrouter/<model-name>`)
    - `temperature` – number 0.0–2.0 (max 2 dec.)
- Request Body: JSON zgodny z `CreateGenerationCommand`; wymagane nagłówki `Content-Type: application/json`, autoryzacja przez Supabase session cookie/JWT obsługiwane w middleware.
- Maksymalny rozmiar payloadu: ograniczyć (middleware/handler) do ≤10 kB, aby wyprzedzić limit 10 000 znaków.
- Walidacja: schema `createGenerationSchema` w `src/lib/validators/aiGenerations.ts` (trim, długość, whitelist modeli, zakres temperatury, integer dla `maxFlashcards`).

## 3. Wykorzystywane typy
- `CreateGenerationCommand`
- `CreateGenerationResponseDto`
- `GenerationSummaryDto`
- `AiGenerationStatus`
- Pomocniczo: `AiGenerationMetricsDto` (inicjalizacja pól zerowych), `FlashcardSource` (dla przyszłych walidacji limitu), typ SupabaseClient z `src/db/supabase.client.ts`, wspólne typy walidacyjne (np. `PaginationMeta` jeżeli re-używamy helperów).

## 4. Szczegóły odpowiedzi
- Sukces: HTTP 202 Accepted, body `CreateGenerationResponseDto` zawierające `generation.id`, `status` (`pending`), `sourceTextLength`, `maxFlashcards`, `createdAt`, `expiresAt` (obliczone np. +5 min). Wartość `status` zawsze `pending` w tym kroku.
- Błędy biznesowe: JSON envelope `{ "error": { "code", "message", "details" } }` z odpowiednim statusem (400/401/409/413/422/500) i kodami (`VALIDATION_ERROR`, `CONFLICT`, `PAYLOAD_TOO_LARGE`, `UNAUTHORIZED`, `INTERNAL_ERROR`).
- Brak zwracania pełnego `sourceText` w odpowiedzi ani w logach klienta.

## 5. Przepływ danych
1. Middleware Astro uwierzytelnia użytkownika i udostępnia `locals.supabase` oraz `locals.user` (z `id`).
2. Handler API parsuje i waliduje żądanie (schema Zod `createGenerationSchema`) → mapuje do `CreateGenerationCommand`.
3. Handler wywołuje serwis `aiGenerationsService.createGeneration(command, context)` (nowy/rozszerzony w `src/lib/services/aiGenerationsService.ts`).
4. Serwis:
   - Sprawdza brak innej `pending` generacji (`SELECT` z `app.ai_generation_logs` RLS → user scope) i waliduje, że użytkownik ma <15 istniejących fiszek (guard przed generacją przekraczającą limit w workerze).
   - Normalizuje input (trim, usuwanie znaków sterujących), wylicza `sourceTextLength = [...].length` w kodowaniu Unicode, równolegle generuje hash SHA-256 (np. `crypto.subtle.digest`).
   - Buduje rekord INSERT z polami: `source_text` (pełny, ztrimowany tekst), `source_text_length`, `source_text_hash`, `status='pending'`, `generated_count=0`, `accepted_* = 0`, `rejected_count=0`, `temperature`, `model`, `proposed_flashcards=jsonb_build_object('maxFlashcards', command.maxFlashcards, 'items', '[]'::jsonb)`, `duration_ms=null`, `error_message=null`.
   - Opcjonalnie publikuje komunikat do kolejki/worker (np. Supabase functions, background job) z ID generacji i payloadem (hash zamiast pełnego tekstu w logach) oraz parametrami (`model`, `temperature`, `maxFlashcards`).
5. Handler buduje `CreateGenerationResponseDto` (`maxFlashcards` przenoszone z walidacji). `expiresAt` wyliczane lokalnie w handlerze/serwisie bez zapisu do DB (np. `new Date(createdAt + 5 * 60 * 1000).toISOString()`).
6. Worker (poza zakresem planu) odczytuje rekord, wykonuje generację AI, aktualizuje `proposed_flashcards`, metryki i status; w razie błędów wpisuje log do `app.ai_generation_error_logs` i aktualizuje `status='failed'`.

## 6. Względy bezpieczeństwa
- Uwierzytelnianie obowiązkowe: odrzucać gdy `locals.user` brak (`401`).
- Autoryzacja oparta na RLS – operacje DB wykonywać poprzez Supabase klienta z kontekstu, nie service-role.
- Walidować `model` względem whitelisty skonfigurowanej w środowisku (np. `ALLOWED_AI_MODELS`). W logach auditowych przechowywać tylko hash i identyfikator generacji.
- Ograniczyć i sanityzować `sourceText`: trim, usuwanie niewidocznych znaków, limit znaków oraz bajtów; nie logować pełnej treści.
- Rate limiting (już w middleware) – upewnić się, że endpoint zgłasza 429 z globalnego mechanizmu (nie wymaga dodatkowej implementacji, ale wspomnieć w QA).
- Hash w bazie i w logach błędów zamiast przechowywania surowego tekstu.
- Temperatura i model przekazywane tylko do workerów; w API nie przechowywać secretów.

## 7. Obsługa błędów
- 400 Bad Request: payload brak wymaganych pól, tekst poza zakresem długości, `maxFlashcards` poza 1–15, niespełnienie warunku `char_length(sourceText) === sourceTextLength` (błędy Zod mapowane na kod `VALIDATION_ERROR`).
- 401 Unauthorized: brak aktywnej sesji Supabase.
- 409 Conflict: istniejąca `pending` generacja użytkownika lub przekroczony jednoczesny limit (opcjonalnie na poziomie business).
- 413 Payload Too Large: rozmiar treści przekracza ustalony limit (obsługiwany przez middleware/handler).
- 422 Unprocessable Entity: `temperature` poza zakresem, `model` niedozwolony.
- 500 Internal Server Error: niepowodzenie zapisu DB, błąd generacji hash, awaria wysłania zadania do kolejki, niespójność transakcyjna (np. worker enqueue nieudany po insercie). W przypadku błędu po wstawieniu rekordu należy zaktualizować rekord na `failed`, ustawić `error_message`, dopisać wpis w `app.ai_generation_error_logs` z `error_code` (`QUEUE_ENQUEUE_FAILED`, `DB_WRITE_FAILED` itp.) i `source_text_hash`.
- Błędy logować przez centralny logger (bez tekstu źródłowego, tylko hash + userId).

## 8. Rozważania dotyczące wydajności
- Wczesna walidacja i odrzucenie dużych payloadów zanim sięgniemy do DB.
- Upewnić się, że zapytania sprawdzające `pending` korzystają z indeksów (`user_id`, `status`).
- Hashowanie wykonywać jednokrotnie; rozważyć użycie strumieniowego obliczania przy bardzo długich tekstach.
- Worker pipeline powinien obsługiwać backpressure; planować retry logic poza API. Rozważyć zapisywanie `maxFlashcards` w strukturze `proposed_flashcards` w celu łatwej rekonstrukcji kontekstu po stronie widoku.
- Unikać synchronizacji ciążącej na DB transakcji – insert + enqueue w jednej sekwencji, ale bez długotrwających operacji.

## 9. Etapy wdrożenia
1. Utwórz lub zaktualizuj schemat Zod dla `CreateGenerationCommand` (np. `src/lib/validators/aiGenerations.ts`) z walidacją długości, whitelistą modeli, zakresu temperatury, limitu `maxFlashcards` oraz sanitizacją znaków sterujących.
2. Dodaj/rozszerz serwis `src/lib/services/aiGenerationsService.ts` o funkcję `createGeneration`. Zaimplementuj kontrolę równoległej generacji, weryfikację limitu fiszek, trim + hash + długość, insert w transakcji oraz obsługę wyjątków i log błędów.
3. Utwórz endpoint Astro w `src/pages/api/ai-generations.ts` (POST handler) pobierający Supabase klienta z `locals`, wywołujący serwis i zwracający 202 z DTO (`CreateGenerationResponseDto`).
4. Skonfiguruj publikację zadania do warstwy workerów (np. Supabase Queue, background job) i ustal payload (`generationId`, `userId`, `maxFlashcards`, `model`, `temperature`, `sourceTextHash`). Udokumentuj interfejs wiadomości.
5. Dodaj testy jednostkowe/integracyjne: walidacja schematu, przypadek pending conflict, poprawny insert (mock Supabase), scenariusz enqueue failure → `failed` + log, limit payloadu.
6. Zaktualizuj dokumentację API (OpenAPI/README) oraz dodaj monitoring (logging bez treści źródłowej) i obserwację metryk (`accepted_*`, `generated_count`).
7. Zweryfikuj limit payloadu i działanie middleware rate-limiting w środowisku dev; zadbaj o smoke-test integracji widoku `/generate` z endpointem.


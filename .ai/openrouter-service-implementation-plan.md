# OpenRouter Service Implementation Plan

## 1. Opis usługi

OpenRouter Service to dedykowany moduł odpowiedzialny za komunikację z zewnętrznym API OpenRouter w celu realizacji chat completions bazujących na LLM. Usługa:

- Inicjalizuje połączenie z API OpenRouter
- Buduje spójne wiadomości z wykorzystaniem komunikatów systemowych i użytkownika
- Wysyła żądania z odpowiednio zdefiniowanymi parametrami modelu i formatem odpowiedzi
- Parsuje i waliduje odpowiedzi zgodnie ze zdefiniowanym schematem JSON
- Obsługuje błędy i zapewnia bezpieczne przechowywanie klucza API

## 2. Opis konstruktora

````ts
constructor(options: OpenRouterOptions)```

Parametry:
- `apiKey: string` — klucz API pobierany z ENV
- `baseUrl?: string` — opcjonalny endpoint OpenRouter (domyślnie https://openrouter.ai)
- `defaultModel?: string` — nazwa modelu, np. `gpt-3.5-turbo`
- `defaultParameters?: Record<string, any>` — domyślne parametry modelu (temperature, max_tokens itp.)

Konstruktor:
1. Waliduje obecność klucza API i rzuca błąd, jeśli nie jest ustawiony
2. Ustawia domyślne wartości baseUrl i modelu
3. Inicjalizuje klienta HTTP (np. axios lub fetch)

## 3. Publiczne metody i pola

### 3.1. sendChatCompletion(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>

- Buduje payload z:
  - `systemMessage`: messages.find(m => m.role === 'system')
  - `userMessages`: pozostałe wiadomości użytkownika
  - `model` i `parameters` (połączenie defaultParameters z options.parameters)
  - `response_format`: { type: 'json_schema', json_schema: { name: 'ChatResponseSchema', strict: true, schema: ChatResponseSchema } }
- Wysyła żądanie POST na ` ${baseUrl}/v1/chat/completions`
- Czeka na odpowiedź, parsuje JSON i waliduje przy użyciu Zod lub innego validatora
- Zwraca sformatowane odpowiedzi lub rzuca wyjątek w razie błędu

### 3.2. setSystemMessage(message: string): void
- Umożliwia dynamiczne ustawienie lub modyfikację komunikatu systemowego (role: 'system').

### 3.3. setUserMessage(message: string): void
- Pozwala na zdefiniowanie lub aktualizację komunikatu użytkownika (role: 'user').

### 3.4. setResponseFormat(format: ResponseFormat): void
- Konfiguruje oczekiwany schemat odpowiedzi, np. { type: 'json_schema', json_schema: { name: 'ChatResponseSchema', strict: true, schema: ChatResponseSchema } }.

### 3.5. setModel(name: string, parameters: ModelParameters): void
- Ustawia nazwę modelu oraz jego parametry (temperature, top_p, frequency_penalty, presence_penalty).

## 4. Prywatne metody i pola

### 4.1. buildPayload(messages: ChatMessage[], options: ChatOptions): OpenRouterPayload

- Łączy komunikat systemowy i użytkownika
- Dodaje parametr `model` i `parameters`
- Ustawia `response_format` z JSON Schema

### 4.2. parseResponse(response: any): ChatResponse

- Waliduje strukturę odpowiedzi
- Mapuje pola API na wewnętrzny typ `ChatResponse`

### 4.3. handleError(error: any): never

- Rozpoznaje typ błędu (sieć, autoryzacja, limit)
- Loguje szczegóły
- Rzuca specjalny wyjątek `OpenRouterError` z kodem i opisem

### 4.4. validateSchema(data: any, schema: ZodSchema): unknown

- Używa `schema.parse` do walidacji lub rzuca `SchemaValidationError`

## 5. Obsługa błędów

Potencjalne scenariusze:
1. Brak klucza API
2. Nieprawidłowy klucz API (401 Unauthorized)
3. Błąd sieci (timeout, DNS)
4. Limit API (429 Too Many Requests)
5. Błędna struktura odpowiedzi (ValidationError)
6. Nieobsługiwany model (404 lub 400)

Dla każdego:
- Wczesne wykrycie i czytelny komunikat
- Automatyczny retry tylko dla błędów sieciowych (exponential backoff)
- Rozróżnienie retrialnych i nietrialnych błędów

## 6. Kwestie bezpieczeństwa

- Przechowywanie klucza wyłącznie w ENV (`process.env.OPENROUTER_API_KEY`)
- Nie logować klucza w logach ani w monitoringu
- Wymuszenie HTTPS
- Ograniczenie uprawnień w rolach i politykach dostępu
- Sanityzacja danych wejściowych

## 7. Plan wdrożenia krok po kroku

1. Analiza wymagań i przegląd dokumentacji API OpenRouter.
2. Instalacja zależności:
   ```bash
   npm install axios zod
````

3. Konfiguracja zmiennych środowiskowych `.env`:
   ```env
   OPENROUTER_API_KEY=twój_klucz
   OPENROUTER_BASE_URL=https://openrouter.ai
   ```
4. Utworzenie struktury folderów `src/lib/services/openrouter/` i pliku `OpenRouterService.ts`.
5. Implementacja modułu klienta API:
   - Konstruktor: inicjalizacja `apiKey`, `baseUrl`, `defaultModel`, `defaultParameters`.
   - Prywatna metoda `executeRequest()`: wysyłanie żądań HTTP z retry i backoff.
   - Metoda `buildPayload()`: łączenie komunikatów i parametrów.
   - Setter’y: `setSystemMessage`, `setUserMessage`, `setResponseFormat`, `setModel`.
6. Implementacja warstwy logiki czatu:
   - Publiczna metoda `sendChatCompletion()` wykorzystująca zbudowany payload.
   - Parsowanie i walidacja odpowiedzi w `parseResponse()`.
7. Implementacja obsługi strukturalnych odpowiedzi:
   - Użycie `response_format` z JSON Schema.
   - Walidacja z użyciem Zod lub innej biblioteki.
8. Implementacja obsługi błędów i logowania:
   - Metoda `handleError()`: rozróżnianie błędów sieciowych, autoryzacji, limitów.
   - Automatyczny retry tylko dla błędów retrialnych.
9. Integracja usługi w warstwie API Astro (`src/pages/api/chat.ts`).
10. Konfiguracja CI/CD w GitHub Actions: instalacja, testy, lintowanie.
11. Testy end-to-end: wysłanie przykładowych zapytań, weryfikacja formatowania i obsługi błędów.
12. Monitorowanie produkcji: logowanie błędów, alerty dla nieudanych wywołań i limitów.

---

_Przewodnik przygotowany dla technologii Astro 5, TypeScript 5, React 19, Tailwind 4, Shadcn/ui oraz Supabase._

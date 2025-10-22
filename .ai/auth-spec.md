# Specyfikacja architektury modułu autentykacji — 10x-cards

Dokument opisuje architekturę funkcjonalności rejestracji, logowania, wylogowywania i odzyskiwania hasła użytkowników zgodnie z wymaganiami PRD oraz stosu technologicznego (Astro 5, React 19, TypeScript 5, Tailwind 4, Shadcn/ui, Supabase).

Założenia
- Korzystamy z Supabase Auth jako źródła prawdy dotyczącego tożsamości użytkowników.
- Aplikacja jest głównie serwowana przez Astro (SSR), a interaktywne formularze implementujemy jako komponenty React (klientowe).
- Nie zmieniamy istniejąnej funkcjonalności generowania fiszek; dodajemy warstwę auth tak, aby chronić operacje (np. generowanie i zapisywanie fiszek pod użytkownikiem).
- Zmiany muszą współgrać z istniejącą strukturą katalogów (`src/pages`, `src/components`, `src/layouts`, `src/db`).

1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

1.1. Strony i routy
- `src/pages/login.astro` — strona logowania (SSR + osadzenie komponentu `LoginForm`)
- `src/pages/register.astro` — strona rejestracji (SSR + `RegisterForm`)
- `src/pages/forgot-password.astro` — strona inicjowania resetu hasła (`ForgotPasswordForm`)
- `src/pages/reset-password.astro` — strona wpisania nowego hasła po kliknięciu w link z e-maila (token w URL)
- `src/pages/me.astro` (opcjonalnie) — strona profilu użytkownika (chroniona)
- Wszystkie wymienione strony korzystają z nowego lub rozszerzonego layoutu auth (`src/layouts/AuthLayout.astro`) albo z istniejącego `Layout.astro` z wariantem auth.

1.2. Nowe komponenty (React client-side)
- `src/components/auth/LoginForm.tsx` — komponent formularza logowania; obsługa pól `email`, `password`; komunikacja bezpośrednio z Supabase client-side (pobieranym z `src/db/supabase.client.ts`).
- `src/components/auth/RegisterForm.tsx` — rejestracja; pola: `email`, `password`, `confirmPassword`, ewentualnie `displayName`.
- `src/components/auth/ForgotPasswordForm.tsx` — formularz wysyłający żądanie resetu hasła (email).
- `src/components/auth/ResetPasswordForm.tsx` — formularz zmiany hasła na stronie docelowej po kliknięciu w link (weryfikacja tokena z URL, nowego hasła i potwierdzenia).
- `src/components/auth/AuthStatus.tsx` — mały komponent pokazujący aktualny stan auth (avatar, email, przycisk wyloguj) — w navbarze.
- `src/components/auth/ProtectedRouteWrapper.tsx` — (opcjonalnie) wrapper do chronienia komponentów React (pokazuje loader lub przekierowuje do `/login` jeśli brak sesji).

1.3. Podział odpowiedzialności: Astro vs React
- Astro pages (np. `login.astro`) odpowiadają za SSR, ustawienie meta, i załączenie layoutu; mają prostą, statyczną warstwę HTML i osadzają komponent React jako klienta.
  - Sterowanie nawigacją (redirect po zalogowaniu) może być inicjowane po stronie klienta przez komponent React; serwer (Astro) może też wykonywać redirect SSR na podstawie sesji (see middleware).
- React components odpowiadają za: walidację formularzy po stronie klienta, wywołania do Supabase client (signUp, signIn, resetPassword), obsługę błędów, lokalne stany (loading, success) i wysyłanie opcjonalnych żądań do własnych endpointów API (np. `POST /api/auth/post-register`), jeśli potrzebna jest inicjalizacja dodatkowych rekordów w DB.

1.4. Layouty i UI
- `src/layouts/Layout.astro` — rozszerzyć o prop `user?: UserPayload` i miejsce na `AuthStatus` w nav.
- `src/layouts/AuthLayout.astro` — prosty layout dla stron auth (centrowany formularz, link do strony głównej).
- Wykorzystać komponenty z `src/components/ui` (shadcn/ui) i tailwind zgodnie z istniejącym stylem projektu.

1.5. Walidacja i komunikaty błędów
- Walidacja po stronie klienta w komponentach React (użyj istniejących `src/lib/validators/*` lub `zod`/custom):
  - Email: format RFC 5322 (prostą regułą regex lub funkcją walidującą)
  - Hasło: min 8 znaków, przynajmniej jedna mała litera, jedna duża, jedna cyfra (opcja dla MVP: min 8 i potwierdzenie)
  - Confirm password musi równać się password
- Walidacja po stronie serwera (API endpoints) — re-validate wszystkie wejścia.
- Komunikaty błędów:
  - Mapować kody błędów Supabase na przyjazne komunikaty (np. `Invalid login credentials` -> "Nieprawidłowy e‑mail lub hasło").
  - Obsługa stanu `email not confirmed` (jeśli włączone potwierdzenie e‑mail) — komunikat: "Potwierdź adres e‑mail (sprawdź skrzynkę)."
  - Walidacja pól formularza: inline errors (pod polami) + banner z ogólnym błędem.

1.6. Scenariusze użytkownika (przykłady obsługi)
- Rejestracja (bezpośrednio client-side):
  1. Użytkownik wypełnia `RegisterForm` -> client-side walidacja -> `supabase.auth.signUp({ email, password })`.
  2. Jeśli Supabase zwraca success: w MVP włącz automatyczne zalogowanie po rejestracji (o ile wyłączone potwierdzenie e‑mail); jeśli włączone potwierdzenie, pokaż ekran "Sprawdź pocztę".
  3. Po potwierdzeniu e‑mail (jeśli włączone) użytkownik loguje się; w przeciwnym razie pozostaje zalogowany po rejestracji.
  4. (Opcjonalnie) `RegisterForm` po otrzymaniu `session` lub `user` wywołuje `POST /api/auth/post-register` (serwer wstawia profil do `app.profiles` lub inicjalizuje statystyki).

- Logowanie (client-side):
  1. `LoginForm` wywołuje `supabase.auth.signInWithPassword({email, password})` lub starsze API.
  2. Jeśli success: ustawiamy session client-side (supabase JS robi to automatycznie) i przekierowujemy do `/generate` (lub do redirect param).
  3. Jeśli błąd: wyświetlamy przyjazny komunikat.

- Wylogowanie: `supabase.auth.signOut()` z poziomu `AuthStatus` komponentu; po sukcesie przekierowanie do strony głównej.

- Reset hasła (inicjacja):
  1. `ForgotPasswordForm` -> `supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://<app>/reset-password" })` (Supabase wyśle e‑mail z linkiem).
  2. Link kieruje użytkownika na `reset-password` z tokenem w URL; `ResetPasswordForm` weryfikuje token i pozwala ustawić nowe hasło -> wywołanie `supabase.auth.updateUser({ password })` lub endpoint server-side, w zależności od implementacji.

2. LOGIKA BACKENDOWA

2.1. Endpointy API (Astro server functions lub pliki w `src/pages/api/`)
Uwaga: część operacji (logowanie, rejestracja, reset) można wykonać wyłącznie po stronie klienta przy pomocy Supabase JS; jednakże wskazane jest przygotowanie minimalnych endpointów server-side do dodatkowej logiki (inicjalizacja profilu, weryfikacja tokenów, bezpieczne operacje wymagające serwera):

- `POST /api/auth/post-register` — body: { userId: string, email?: string, displayName?: string }
  - Cel: po rejestracji w Supabase wykonywana jest inicjalizacja rekordów w `public.profiles` i inne czynności (np. statystyki). Autoryzacja: otrzymuje `Authorization: Bearer <access_token>` lub cookie sesji.
  - Zwraca 201 + profile record lub 4xx on error.

- `GET /api/auth/me` — zwraca publiczne dane użytkownika (id, email, metadata) na podstawie cookie sesji lub tokena z nagłówka. Przydatne do SSR i do przekazywania `user` do `Layout.astro`.

- `POST /api/auth/refresh` (opcjonalnie) — jeśli używamy refresh token flow serwera.

- `POST /api/auth/force-reset` (opcjonalnie, admin) — inicjacja resetu hasła dla usera.

- `DELETE /api/auth/account` — usuwa konto zalogowanego użytkownika oraz wszystkie powiązane dane.
  - Autoryzacja: wymaga ważnej sesji użytkownika; operacja po stronie serwera korzysta z Supabase Admin API (`SUPABASE_SERVICE_KEY`).
  - Efekt: usunięcie `auth.users` powoduje kaskadowe usunięcie `app.profiles` oraz `app.flashcards` (zgodnie z FK i `on delete cascade`).

2.2. Modele danych i migracje
- `app.profiles` (już istnieje):
  - `user_id: uuid` (PK) referencje `auth.users(id)` z `on delete cascade`
  - `display_name: varchar(120)`, `time_zone: varchar(64)`, `marketing_opt_in: boolean not null default false`
  - `created_at: timestamptz`, `updated_at: timestamptz`
- `app.flashcards` (już istnieje):
  - `id: uuid` (PK), `user_id: uuid` referencje `app.profiles(user_id)` z `on delete cascade`
  - `front: varchar(200)`, `back: varchar(500)`, `source: enum`, `origin_generation_id: uuid?`
  - Limit 15 fiszek na użytkownika wymuszany triggerem `app.enforce_flashcard_limit`
- `app.ai_generation_logs` i `app.ai_generation_error_logs` (już istnieją):
  - Walidacje długości tekstu źródłowego 1000–10000 znaków, metryki wygenerowanych/zaakceptowanych/odrzuconych
- RLS: aktywne dla ww. tabel, polityki ograniczają dostęp do rekordów użytkownika (`auth.uid()`).

2.3. Walidacja danych wejściowych
- Wszystkie endpointy serwera muszą re-validate wejście (preferowane: `zod` lub lokalne helpery w `src/lib/validators/*`).
- Błędy walidacji zwracane jako 400 z ciałem { error: string, details?: Record }.

2.4. Obsługa wyjątków
- Centralne mapowanie błędów serwera do czytelnych komunikatów:
  - 400 — błędne dane wejściowe (walidacja)
  - 401 — brak autoryzacji
  - 403 — brak uprawnień
  - 404 — nie znaleziono zasobu
  - 500 — błąd serwera (z logowaniem wewnętrznym)
- Logować błędy serwera w konsoli i (opcjonalnie) w zewnętrznym systemie monitoringu.
- Nie ujawniać wewnętrznych treści błędów użytkownikowi; użytkownik otrzymuje przyjazny komunikat.

2.5. SSR i middleware
- `src/middleware/index.ts` — używaj klienta anon i ciasteczek sesji Supabase:
  - Odczytuj `sb-access-token` i `sb-refresh-token`, przywracaj sesję przez `supabase.auth.setSession(...)`, zapisuj `context.locals.user` oraz `context.locals.supabase`.
  - Chroń wrażliwe routy (np. `/generate`, `/me`) — jeśli brak `context.locals.user`, przekieruj 302 do `/login`.
  - Nie używaj `service_role` w middleware; `SUPABASE_SERVICE_KEY` stosuj wyłącznie w zaufanych endpointach server-side (np. kasowanie konta).
- Konfiguracja w `astro.config.mjs`: zapewnij dostęp do `SUPABASE_URL`, `SUPABASE_ANON_KEY`; `SUPABASE_SERVICE_KEY` dostępne tylko po stronie serwera.

3. SYSTEM AUTENTYKACJI (Supabase + Astro)

3.1. Główne założenia integracji
- Używamy oficjalnego klienta Supabase JS w dwóch wariantach:
  - client-side (anon key) — `src/db/supabase.client.ts` już istnieje; komponenty React z niego korzystają do `signUp`, `signIn`, `signOut`, `resetPasswordForEmail`, `updateUser`.
  - server-side (service_role lub server SDK) — do weryfikacji tokenów i wykonywania bezpiecznych operacji inicjalizacyjnych (np. `post-register`), w `src/pages/api/*` oraz w `src/middleware/index.ts`.

3.2. Flows implementacyjne
- Rejestracja (email + password):
  - Client: `supabaseClient.auth.signUp({ email, password })`.
  - Supabase wyśle e‑mail potwierdzający (jeżeli włączone w projekcie). Aplikacja wyświetla instrukcję "Sprawdź skrzynkę".
  - Server: opcjonalny `POST /api/auth/post-register` wywołany z client po otrzymaniu `user` (z header Authorization lub z cookie), aby dodać rekord w `app.profiles`.

- Logowanie:
  - Client: `supabaseClient.auth.signInWithPassword({ email, password })`. Po sukcesie Supabase ustawia session i cookie (jeśli używamy auth helpers) lub klient trzyma token.
  - SSR: `middleware` może wczytać sesję i dodać `user` do `Layout.astro`.

- Wylogowanie:
  - Client: `supabaseClient.auth.signOut()`; następnie client robi `location.href = '/'` lub używa routera.

- Reset hasła:
  - Client: `supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: https://<app>/reset-password })`.
  - Link w e‑mailu prowadzi na `reset-password` z parametrem token; `ResetPasswordForm` po weryfikacji ustawia nowe hasło przy użyciu odpowiedniej metody Supabase (server lub client).

3.3. Autoryzacja i zabezpieczenia
- Wszystkie API endpoints wymagające użytkownika będą weryfikować token JWT z cookie lub nagłówka `Authorization: Bearer <access_token>`.
- Relacje w DB i uprawnienia RLS (jeśli używane) będą sprawdzać `auth.uid()` lub `current_setting('jwt.claims')` zgodnie z Supabase.
- Environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_KEY` (tylko na server-side, nigdy w kodzie klienta)

3.4. UX & edge cases
- Adres e‑mail już istnieje: przy rejestracji wyświetlić czytelny komunikat i link "Zaloguj się" lub "Zresetuj hasło".
- Niepotwierdzony e‑mail: komunikat wyjaśniający dalsze kroki.
- Link resetu wygasł lub jest nieprawidłowy: komunikat i ponowne wysłanie maila z resetem.
- Brak połączenia z usługą Supabase: globalny banner błędu i logowanie techniczne.

4. KONTRAKTY I SCHEMATY (request / response)

4.1. `POST /api/auth/post-register`
- Request body:
```json
{ "userId": "uuid", "displayName": "string?" }
```
- Response 201:
```json
{ "profile": { "user_id": "uuid", "display_name": "string", "time_zone": "string?", "marketing_opt_in": false } }
```
- Errors: 400, 401, 500

4.2. `GET /api/auth/me`
- Response 200:
```json
{ "user": { "id": "uuid", "email": "string", "aud": "authenticated", "role": "user", "app_metadata": {}, "user_metadata": {} } }
```
- 401 jeśli brak sesji

4.3. `DELETE /api/auth/account`
- Response 200:
```json
{ "status": "deleted" }
```
- Errors: 401, 500

4.4. Client-side Supabase calls (przykłady):
- `supabaseClient.auth.signUp({ email, password })` -> handle `error` and `data`.
- `supabaseClient.auth.signInWithPassword({ email, password })` -> on success redirect.
- `supabaseClient.auth.resetPasswordForEmail(email, { redirectTo })` -> show success.

5. IMPLEMENTACYJNE ZALECENIA DOT. PLIKÓW I MODUŁÓW

- `src/db/supabase.client.ts` — eksport klienta anon; w SSR i routach używaj `context.locals.supabase` ustawionego w middleware (nie twórz nowych klientów ad-hoc).
- `src/lib/auth/` — logika serwerowa: `server.ts` (helpers), `postRegister.ts`, `deleteAccount.ts` (używa `SUPABASE_SERVICE_KEY`).
- `src/components/auth/` — komponenty React wymienione w 1.2.
- `src/pages/api/auth/` — endpointy serwerowe: `post-register`, `me`, (opcjonalnie) `force-reset`, oraz `account` (DELETE).
- `src/middleware/index.ts` — ochrona routów i udostępnianie `user` do layoutów przez `context.locals`.
- `supabase/migrations` — aktualny schemat wykorzystuje `app.profiles`, `app.flashcards`, `app.ai_generation_logs`; utrzymuj zgodność i RLS.

6. TESTY I WALIDACJA
- Testy E2E (np. Playwright) dla flow: rejestracja -> potwierdzenie e‑mail (mock) -> logowanie -> ochrona routów -> reset hasła.
- Testy jednostkowe dla walidatorów (email, password) oraz testy integracyjne dla endpointów API (mock Supabase lub use test project).

7. Harmonogram wdrożenia (krótki)
- Krok 1: Dodać komponenty UI (formularze) i layouty oraz prostą integrację klient-side z Supabase (signUp/signIn/reset). — 1 dzień
- Krok 2: Dodać middleware SSR i endpoint `GET /api/auth/me` oraz przekazywanie `user` do layoutu — 0.5 dnia
- Krok 3: Dodać `POST /api/auth/post-register` i migracje `profiles` oraz powiązania — 1 dzień
- Krok 4: Testy E2E i poprawki UX — 1 dzień

8. Notatki bezpieczeństwa i prywatność
- Nigdy nie umieszczać `SUPABASE_SERVICE_KEY` w kodzie klienta.
- Upewnić się, że wszystkie dane osobowe przechowywane są zgodnie z RODO: możliwość wyeksportowania/usunięcia konta (endpoint do usuwania profilu + cascade usunięcia fiszek).

9. Dodatkowe uwagi
- Można rozważyć wykorzystanie supabase edge functions zamiast własnych endpointów w `src/pages/api` jeśli preferujemy scentralizowane funkcje serverless.
- Integracja z istniejącymi `src/lib/validators/*` i `src/lib/services/*` (np. `flashcardsService`) tak, aby zapisywanie fiszek wymagało `owner_id` z kontekstu użytkownika.

---

Plik przygotowany jako specyfikacja architektury — do wykorzystania przy implementacji. Kontynuacja: po potwierdzeniu mogę wygenerować listę zadań implementacyjnych (todo) i wykonać pierwsze zmiany (komponenty UI lub middleware) zgodnie z priorytetami.

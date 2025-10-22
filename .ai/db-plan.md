1. Lista tabel z kolumnami, typami danych i ograniczeniami

- **Typy pomocnicze**
  - `app.flashcard_source` ENUM(`manual`, `ai-full`, `ai-edited`).
  - `app.ai_generation_status` ENUM(`pending`, `success`, `failed`).
- **app.profiles** (`user_id` jest jednocześnie kluczem głównym)

This table is managed by Supabase Auth.

- `user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `display_name varchar(120)`
- `time_zone varchar(64)`
- `marketing_opt_in boolean NOT NULL DEFAULT false`
- `created_at timestamptz NOT NULL DEFAULT timezone('utc', now())`
- `updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())`
- **app.flashcards**
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES app.profiles(user_id) ON DELETE CASCADE`
  - `front varchar(200) NOT NULL`
  - `back varchar(500) NOT NULL`
  - `source app.flashcard_source NOT NULL DEFAULT 'manual'`
  - `origin_generation_id uuid REFERENCES app.ai_generation_logs(id) ON DELETE SET NULL`
  - `created_at timestamptz NOT NULL DEFAULT timezone('utc', now())`
  - `updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())`
  - `UNIQUE (user_id, front)`
- **app.ai_generation_logs**
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES app.profiles(user_id) ON DELETE CASCADE`
  - `status app.ai_generation_status NOT NULL DEFAULT 'pending'`
  - `source_text text NOT NULL CHECK (char_length(source_text) BETWEEN 1000 AND 10000)`
  - `source_text_hash varchar(64) NOT NULL`
  - `source_text_length integer NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000)`
  - `CHECK (source_text_length = char_length(source_text))`
  - `proposed_flashcards jsonb NOT NULL`
- Dodać wyzwalacz `app.set_updated_at()` do tabeli `app.ai_generation_error_logs`.
- Dodać wyzwalacz `app.ai_generation_error_logs_before_insert_hash_validate` walidujący zgodność `source_text_length` z oczekiwaniami oraz obliczający hash, jeżeli wpis pochodzi z automatyzacji backendu.
  - `generated_count integer NOT NULL DEFAULT 0 CHECK (generated_count >= 0)`
  - `accepted_count integer NOT NULL DEFAULT 0 CHECK (accepted_count >= 0)`
  - `accepted_unedited_count integer NOT NULL DEFAULT 0 CHECK (accepted_unedited_count >= 0)`
  - `accepted_edited_count integer NOT NULL DEFAULT 0 CHECK (accepted_edited_count >= 0)`
  - `rejected_count integer NOT NULL DEFAULT 0 CHECK (rejected_count >= 0)`
  - `CHECK (accepted_unedited_count + accepted_edited_count = accepted_count)`
  - `CHECK (generated_count >= accepted_count + rejected_count)`
  - `duration_ms integer CHECK (duration_ms >= 0)`
  - `model varchar(120)`
  - `temperature numeric(3,2) CHECK (temperature BETWEEN 0 AND 2)`
  - `error_message text`
  - `created_at timestamptz NOT NULL DEFAULT timezone('utc', now())`
  - `updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())`
- **app.ai_generation_error_logs**
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES app.profiles(user_id) ON DELETE CASCADE`
  - `generation_id uuid REFERENCES app.ai_generation_logs(id) ON DELETE SET NULL`
  - `model varchar(120) NOT NULL`
  - `source_text_hash varchar(64) NOT NULL`
  - `source_text_length integer NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000)`
  - `error_code varchar(100) NOT NULL`
  - `error_message text NOT NULL`
  - `created_at timestamptz NOT NULL DEFAULT timezone('utc', now())`

2. Relacje między tabelami

- `auth.users (1) ──── (1) app.profiles` poprzez `app.profiles.user_id` (klucz główny/obcy).
- `app.profiles (1) ──── (N) app.flashcards` poprzez `app.flashcards.user_id`.
- `app.profiles (1) ──── (N) app.ai_generation_logs` poprzez `app.ai_generation_logs.user_id`.
- `app.ai_generation_logs (1) ──── (N) app.flashcards` (opcjonalna) poprzez `app.flashcards.origin_generation_id` (pozwala powiązać zatwierdzone fiszki z logiem generacji AI).
- `app.profiles (1) ──── (N) app.ai_generation_error_logs` poprzez `app.ai_generation_error_logs.user_id`.
- `app.ai_generation_logs (1) ──── (N) app.ai_generation_error_logs` (opcjonalna) poprzez `app.ai_generation_error_logs.ai_generation_log_id`.

3. Indeksy

- `CREATE INDEX app_flashcards_user_id_idx ON app.flashcards(user_id);`
- `CREATE INDEX app_flashcards_origin_generation_id_idx ON app.flashcards(origin_generation_id);`
- `CREATE INDEX app_flashcards_source_idx ON app.flashcards(source);`
- `CREATE INDEX app_ai_generation_logs_user_id_created_at_idx ON app.ai_generation_logs(user_id, created_at DESC);`
- `CREATE INDEX app_ai_generation_logs_status_idx ON app.ai_generation_logs(status);`
- `CREATE INDEX app_ai_generation_logs_source_text_hash_idx ON app.ai_generation_logs(source_text_hash);`
- `CREATE INDEX app_ai_generation_error_logs_user_id_created_at_idx ON app.ai_generation_error_logs(user_id, created_at DESC);`

4. Zasady PostgreSQL (RLS)

- `ALTER TABLE app.profiles ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY profiles_select_own ON app.profiles FOR SELECT USING (user_id = auth.uid());`
  - `CREATE POLICY profiles_update_own ON app.profiles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`
  - `CREATE POLICY profiles_insert_self ON app.profiles FOR INSERT WITH CHECK (user_id = auth.uid());`
- `ALTER TABLE app.flashcards ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY flashcards_manage_own ON app.flashcards FOR SELECT, INSERT, UPDATE, DELETE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`
- `ALTER TABLE app.ai_generation_logs ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY ai_generation_logs_manage_own ON app.ai_generation_logs FOR SELECT, INSERT, UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`
  - `CREATE POLICY ai_generation_logs_delete_service_role ON app.ai_generation_logs FOR DELETE USING (auth.role() = 'service_role');`
- `ALTER TABLE app.ai_generation_error_logs ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY ai_generation_error_logs_manage_own ON app.ai_generation_error_logs FOR SELECT, INSERT USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`
  - `CREATE POLICY ai_generation_error_logs_delete_service_role ON app.ai_generation_error_logs FOR DELETE USING (auth.role() = 'service_role');`

5. Dodatkowe uwagi

- Wymagana jest aktywacja rozszerzenia `pgcrypto` dla `gen_random_uuid()` oraz utworzenie schematu `app` (`CREATE SCHEMA app;`).
- Dla spójności znaczników czasu zastosować wyzwalacz `app.set_updated_at()` aktualizujący `updated_at` przy każdej modyfikacji w tabelach `app.profiles`, `app.flashcards`, `app.ai_generation_logs`.
- Limit 15 fiszek na użytkownika egzekwować funkcją `app.enforce_flashcard_limit()` oraz wyzwalaczem `app.flashcards_before_insert_limit` BEFORE INSERT na tabeli `app.flashcards` (odrzucając insert, gdy użytkownik posiada ≥15 aktywnych fiszek).
- Rozważyć funkcję `app.log_ai_generation()` zapisywaną po zakończeniu generowania, aby wypełnić pola `status`, `accepted_count`, `rejected_count`, `duration_ms` oraz `error_message` (w przypadku błędu), co wspiera metryki KPI.
- Funkcja `app.log_ai_generation()` powinna dodatkowo aktualizować pola `generated_count`, `accepted_unedited_count`, `accepted_edited_count`, `source_text_hash` oraz `source_text_length`, co umożliwia spójne raportowanie KPI i weryfikację duplikatów źródłowych tekstów.
- Dodać wyzwalacz `app.ai_generation_error_logs_before_insert_hash_validate` walidujący zgodność `source_text_length` z oczekiwaniami oraz obliczający hash, jeżeli wpis pochodzi z automatyzacji backendu.

-- migration purpose: establish app schema, enums, tables, triggers, functions, and rls policies for flashcard ai pipeline
-- affected objects: schema app; types app.flashcard_source, app.ai_generation_status; tables app.profiles, app.flashcards, app.ai_generation_logs, app.ai_generation_error_logs; supporting functions, triggers, indexes, policies
-- notes: ensure pgcrypto extension is available; migration is designed for supabase deployments and assumes auth helpers auth.uid() and auth.role()

-- set up foundational schema and extension support
create schema if not exists app;

-- enable pgcrypto for gen_random_uuid support
create extension if not exists pgcrypto;

-- define application-specific enum types used across tables
do $$
begin
    if not exists (
        select 1 from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'app' and t.typname = 'flashcard_source'
    ) then
        create type app.flashcard_source as enum ('manual', 'ai-full', 'ai-edited');
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1 from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'app' and t.typname = 'ai_generation_status'
    ) then
        create type app.ai_generation_status as enum ('pending', 'success', 'failed');
    end if;
end
$$;

-- utility trigger function to keep updated_at timestamps consistent across tables
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

-- core profile table mirrors supabase auth users with additional metadata
create table if not exists app.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name varchar(120),
    time_zone varchar(64),
    marketing_opt_in boolean not null default false,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

-- central ai generation log for tracking source material and outcomes
create table if not exists app.ai_generation_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references app.profiles(user_id) on delete cascade,
    status app.ai_generation_status not null default 'pending',
    source_text text not null check (char_length(source_text) between 1000 and 10000),
    source_text_hash varchar(64) not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    check (source_text_length = char_length(source_text)),
    proposed_flashcards jsonb not null,
    generated_count integer not null default 0 check (generated_count >= 0),
    accepted_count integer not null default 0 check (accepted_count >= 0),
    accepted_unedited_count integer not null default 0 check (accepted_unedited_count >= 0),
    accepted_edited_count integer not null default 0 check (accepted_edited_count >= 0),
    rejected_count integer not null default 0 check (rejected_count >= 0),
    check (accepted_unedited_count + accepted_edited_count = accepted_count),
    check (generated_count >= accepted_count + rejected_count),
    duration_ms integer check (duration_ms >= 0),
    model varchar(120),
    temperature numeric(3,2) check (temperature between 0 and 2),
    error_message text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

-- flashcards table storing user-managed card content; enforces uniqueness and source linkage
create table if not exists app.flashcards (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references app.profiles(user_id) on delete cascade,
    front varchar(200) not null,
    back varchar(500) not null,
    source app.flashcard_source not null default 'manual',
    origin_generation_id uuid references app.ai_generation_logs(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    unique (user_id, front)
);

-- error log table captures failures during ai generation with hashed source validation
create table if not exists app.ai_generation_error_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references app.profiles(user_id) on delete cascade,
    generation_id uuid references app.ai_generation_logs(id) on delete set null,
    model varchar(120) not null,
    source_text_hash varchar(64) not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    error_code varchar(100) not null,
    error_message text not null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

-- trigger to keep profile timestamps aligned with updates
drop trigger if exists app_profiles_set_updated_at on app.profiles;
create trigger app_profiles_set_updated_at
before update on app.profiles
for each row
execute function app.set_updated_at();

-- trigger to keep ai generation log timestamps aligned with updates
drop trigger if exists app_ai_generation_logs_set_updated_at on app.ai_generation_logs;
create trigger app_ai_generation_logs_set_updated_at
before update on app.ai_generation_logs
for each row
execute function app.set_updated_at();

-- trigger to keep flashcard timestamps aligned with updates
drop trigger if exists app_flashcards_set_updated_at on app.flashcards;
create trigger app_flashcards_set_updated_at
before update on app.flashcards
for each row
execute function app.set_updated_at();

-- trigger to keep error log timestamps aligned with updates
drop trigger if exists app_ai_generation_error_logs_set_updated_at on app.ai_generation_error_logs;
create trigger app_ai_generation_error_logs_set_updated_at
before update on app.ai_generation_error_logs
for each row
execute function app.set_updated_at();

-- enforce per-user flashcard limit prior to inserts
create or replace function app.enforce_flashcard_limit()
returns trigger
language plpgsql
as $$
declare
    flashcard_count integer;
begin
    select count(*)
    into flashcard_count
    from app.flashcards
    where user_id = new.user_id;

    if flashcard_count >= 15 then
        raise exception 'flashcard limit reached for user %', new.user_id
            using errcode = 'check_violation';
    end if;

    return new;
end;
$$;

drop trigger if exists app_flashcards_before_insert_limit on app.flashcards;
create trigger app_flashcards_before_insert_limit
before insert on app.flashcards
for each row
execute function app.enforce_flashcard_limit();

-- management function to record ai generation outcomes with validation hooks
create or replace function app.log_ai_generation(
    p_generation_id uuid,
    p_status app.ai_generation_status,
    p_generated_count integer,
    p_accepted_count integer,
    p_accepted_unedited_count integer,
    p_accepted_edited_count integer,
    p_rejected_count integer,
    p_duration_ms integer,
    p_error_message text,
    p_source_text_hash varchar,
    p_source_text_length integer
)
returns void
language plpgsql
as $$
declare
    v_source_text text;
    v_current_hash varchar(64);
    v_current_length integer;
    v_rows_updated integer;
    v_computed_hash varchar(64);
    v_computed_length integer;
begin
    if p_generation_id is null then
        raise exception 'generation id must be provided';
    end if;

    if p_generated_count is not null and p_generated_count < 0 then
        raise exception 'generated count must be non-negative';
    end if;

    if p_accepted_count is not null and p_accepted_count < 0 then
        raise exception 'accepted count must be non-negative';
    end if;

    if p_rejected_count is not null and p_rejected_count < 0 then
        raise exception 'rejected count must be non-negative';
    end if;

    if p_accepted_unedited_count is not null and p_accepted_unedited_count < 0 then
        raise exception 'accepted unedited count must be non-negative';
    end if;

    if p_accepted_edited_count is not null and p_accepted_edited_count < 0 then
        raise exception 'accepted edited count must be non-negative';
    end if;

    if p_accepted_count is not null
       and p_accepted_unedited_count is not null
       and p_accepted_edited_count is not null
       and (p_accepted_unedited_count + p_accepted_edited_count) <> p_accepted_count then
        raise exception 'accepted counts must sum correctly';
    end if;

    if p_generated_count is not null
       and p_accepted_count is not null
       and p_rejected_count is not null
       and p_generated_count < (p_accepted_count + p_rejected_count) then
        raise exception 'generated count must be greater than or equal to accepted plus rejected';
    end if;

    if p_duration_ms is not null and p_duration_ms < 0 then
        raise exception 'duration must be non-negative';
    end if;

    select source_text, source_text_hash, source_text_length
    into v_source_text, v_current_hash, v_current_length
    from app.ai_generation_logs
    where id = p_generation_id
    for update;

    if not found then
        raise exception 'no generation log found for id %', p_generation_id;
    end if;

    v_computed_length := char_length(v_source_text);
    v_computed_hash := encode(digest(v_source_text, 'sha256'), 'hex');

    if p_source_text_length is not null and p_source_text_length <> v_computed_length then
        raise exception 'provided source_text_length % does not match stored text length %', p_source_text_length, v_computed_length;
    end if;

    update app.ai_generation_logs
    set
        status = coalesce(p_status, status),
        generated_count = coalesce(p_generated_count, generated_count),
        accepted_count = coalesce(p_accepted_count, accepted_count),
        accepted_unedited_count = coalesce(p_accepted_unedited_count, accepted_unedited_count),
        accepted_edited_count = coalesce(p_accepted_edited_count, accepted_edited_count),
        rejected_count = coalesce(p_rejected_count, rejected_count),
        duration_ms = coalesce(p_duration_ms, duration_ms),
        error_message = coalesce(p_error_message, error_message),
        source_text_hash = coalesce(p_source_text_hash, v_computed_hash, v_current_hash),
        source_text_length = coalesce(p_source_text_length, v_computed_length, v_current_length),
        updated_at = timezone('utc', now())
    where id = p_generation_id;

    get diagnostics v_rows_updated = row_count;

    if v_rows_updated = 0 then
        raise exception 'ai generation log update failed for id %', p_generation_id;
    end if;
end;
$$;

-- before-insert protection for error log rows to ensure hash and length integrity
create or replace function app.ai_generation_error_logs_before_insert_hash_validate()
returns trigger
language plpgsql
as $$
declare
    v_expected_hash varchar(64);
    v_expected_length integer;
    v_expected_text text;
begin
    if new.source_text_length is null then
        raise exception 'source_text_length must be provided';
    end if;

    if new.source_text_length < 1000 or new.source_text_length > 10000 then
        raise exception 'source_text_length must be between 1000 and 10000 characters';
    end if;

    if new.generation_id is not null then
        select source_text, source_text_length
        into v_expected_text, v_expected_length
        from app.ai_generation_logs
        where id = new.generation_id;

        if not found then
            raise exception 'no generation log found for referenced generation_id %', new.generation_id;
        end if;

        v_expected_hash := encode(digest(v_expected_text, 'sha256'), 'hex');

        if new.source_text_hash is null then
            new.source_text_hash := v_expected_hash;
        end if;

        if new.source_text_length is null then
            new.source_text_length := v_expected_length;
        end if;

        if new.source_text_length <> v_expected_length then
            raise exception 'source_text_length % does not match expected % for referenced generation', new.source_text_length, v_expected_length;
        end if;

        if new.source_text_hash <> v_expected_hash then
            raise exception 'source_text_hash does not match expected hash from generation log';
        end if;
    end if;

    if new.source_text_hash is null then
        raise exception 'source_text_hash must be provided or derivable from generation context';
    end if;

    return new;
end;
$$;

drop trigger if exists app_ai_generation_error_logs_before_insert_hash_validate on app.ai_generation_error_logs;
create trigger app_ai_generation_error_logs_before_insert_hash_validate
before insert on app.ai_generation_error_logs
for each row
execute function app.ai_generation_error_logs_before_insert_hash_validate();

-- supporting indexes to optimize frequent lookup paths
create index if not exists app_flashcards_user_id_idx on app.flashcards(user_id);
create index if not exists app_flashcards_origin_generation_id_idx on app.flashcards(origin_generation_id);
create index if not exists app_flashcards_source_idx on app.flashcards(source);
create index if not exists app_ai_generation_logs_user_id_created_at_idx on app.ai_generation_logs(user_id, created_at desc);
create index if not exists app_ai_generation_logs_status_idx on app.ai_generation_logs(status);
create index if not exists app_ai_generation_logs_source_text_hash_idx on app.ai_generation_logs(source_text_hash);
create index if not exists app_ai_generation_error_logs_user_id_created_at_idx on app.ai_generation_error_logs(user_id, created_at desc);

-- row level security activation to ensure policies govern access
alter table app.profiles enable row level security;
alter table app.flashcards enable row level security;
alter table app.ai_generation_logs enable row level security;
alter table app.ai_generation_error_logs enable row level security;

-- rls policies for app.profiles
drop policy if exists profiles_select_own_authenticated on app.profiles;
create policy profiles_select_own_authenticated
on app.profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists profiles_select_own_anon on app.profiles;
create policy profiles_select_own_anon
on app.profiles
for select
to anon
using (false);

drop policy if exists profiles_insert_self_authenticated on app.profiles;
create policy profiles_insert_self_authenticated
on app.profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists profiles_insert_self_anon on app.profiles;
create policy profiles_insert_self_anon
on app.profiles
for insert
to anon
with check (false);

drop policy if exists profiles_update_own_authenticated on app.profiles;
create policy profiles_update_own_authenticated
on app.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists profiles_update_own_anon on app.profiles;
create policy profiles_update_own_anon
on app.profiles
for update
to anon
using (false)
with check (false);

drop policy if exists profiles_delete_any_authenticated on app.profiles;
create policy profiles_delete_any_authenticated
on app.profiles
for delete
to authenticated
using (false);

drop policy if exists profiles_delete_any_anon on app.profiles;
create policy profiles_delete_any_anon
on app.profiles
for delete
to anon
using (false);

-- rls policies for app.flashcards
drop policy if exists flashcards_select_own_authenticated on app.flashcards;
create policy flashcards_select_own_authenticated
on app.flashcards
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists flashcards_select_own_anon on app.flashcards;
create policy flashcards_select_own_anon
on app.flashcards
for select
to anon
using (false);

drop policy if exists flashcards_insert_own_authenticated on app.flashcards;
create policy flashcards_insert_own_authenticated
on app.flashcards
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists flashcards_insert_own_anon on app.flashcards;
create policy flashcards_insert_own_anon
on app.flashcards
for insert
to anon
with check (false);

drop policy if exists flashcards_update_own_authenticated on app.flashcards;
create policy flashcards_update_own_authenticated
on app.flashcards
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists flashcards_update_own_anon on app.flashcards;
create policy flashcards_update_own_anon
on app.flashcards
for update
to anon
using (false)
with check (false);

drop policy if exists flashcards_delete_own_authenticated on app.flashcards;
create policy flashcards_delete_own_authenticated
on app.flashcards
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists flashcards_delete_own_anon on app.flashcards;
create policy flashcards_delete_own_anon
on app.flashcards
for delete
to anon
using (false);

-- rls policies for app.ai_generation_logs
drop policy if exists ai_generation_logs_select_authenticated on app.ai_generation_logs;
create policy ai_generation_logs_select_authenticated
on app.ai_generation_logs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists ai_generation_logs_select_anon on app.ai_generation_logs;
create policy ai_generation_logs_select_anon
on app.ai_generation_logs
for select
to anon
using (false);

drop policy if exists ai_generation_logs_insert_authenticated on app.ai_generation_logs;
create policy ai_generation_logs_insert_authenticated
on app.ai_generation_logs
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists ai_generation_logs_insert_anon on app.ai_generation_logs;
create policy ai_generation_logs_insert_anon
on app.ai_generation_logs
for insert
to anon
with check (false);

drop policy if exists ai_generation_logs_update_authenticated on app.ai_generation_logs;
create policy ai_generation_logs_update_authenticated
on app.ai_generation_logs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists ai_generation_logs_update_anon on app.ai_generation_logs;
create policy ai_generation_logs_update_anon
on app.ai_generation_logs
for update
to anon
using (false)
with check (false);

drop policy if exists ai_generation_logs_delete_service_role on app.ai_generation_logs;
create policy ai_generation_logs_delete_service_role
on app.ai_generation_logs
for delete
to authenticated
using (auth.role() = 'service_role');

drop policy if exists ai_generation_logs_delete_anon on app.ai_generation_logs;
create policy ai_generation_logs_delete_anon
on app.ai_generation_logs
for delete
to anon
using (false);

-- rls policies for app.ai_generation_error_logs
drop policy if exists ai_generation_error_logs_select_authenticated on app.ai_generation_error_logs;
create policy ai_generation_error_logs_select_authenticated
on app.ai_generation_error_logs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists ai_generation_error_logs_select_anon on app.ai_generation_error_logs;
create policy ai_generation_error_logs_select_anon
on app.ai_generation_error_logs
for select
to anon
using (false);

drop policy if exists ai_generation_error_logs_insert_authenticated on app.ai_generation_error_logs;
create policy ai_generation_error_logs_insert_authenticated
on app.ai_generation_error_logs
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists ai_generation_error_logs_insert_anon on app.ai_generation_error_logs;
create policy ai_generation_error_logs_insert_anon
on app.ai_generation_error_logs
for insert
to anon
with check (false);

drop policy if exists ai_generation_error_logs_update_authenticated on app.ai_generation_error_logs;
create policy ai_generation_error_logs_update_authenticated
on app.ai_generation_error_logs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists ai_generation_error_logs_update_anon on app.ai_generation_error_logs;
create policy ai_generation_error_logs_update_anon
on app.ai_generation_error_logs
for update
to anon
using (false)
with check (false);

drop policy if exists ai_generation_error_logs_delete_service_role on app.ai_generation_error_logs;
create policy ai_generation_error_logs_delete_service_role
on app.ai_generation_error_logs
for delete
to authenticated
using (auth.role() = 'service_role');

drop policy if exists ai_generation_error_logs_delete_anon on app.ai_generation_error_logs;
create policy ai_generation_error_logs_delete_anon
on app.ai_generation_error_logs
for delete
to anon
using (false);


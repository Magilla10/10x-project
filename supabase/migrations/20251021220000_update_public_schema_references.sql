-- migration purpose: update functions and triggers to reference public schema after moving objects from app schema
-- affected objects: functions public.set_updated_at, public.enforce_flashcard_limit, public.log_ai_generation, public.ai_generation_error_logs_before_insert_hash_validate,
--                   triggers on public.profiles, public.flashcards, public.ai_generation_logs, public.ai_generation_error_logs

-- Recreate set_updated_at helper in public schema
drop function if exists public.set_updated_at() cascade;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Recreate flashcard limit enforcement function in public schema
drop function if exists public.enforce_flashcard_limit() cascade;

create or replace function public.enforce_flashcard_limit()
returns trigger
language plpgsql
as $$
declare
  flashcard_count integer;
begin
  select count(*)
    into flashcard_count
    from public.flashcards
   where user_id = new.user_id;

  if flashcard_count >= 15 then
    raise exception 'flashcard limit reached for user %', new.user_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Recreate AI generation logging function with public schema references
drop function if exists public.log_ai_generation(
  uuid,
  public.ai_generation_status,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  text,
  varchar,
  integer
) cascade;

create or replace function public.log_ai_generation(
  p_generation_id uuid,
  p_status public.ai_generation_status,
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
    from public.ai_generation_logs
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

  update public.ai_generation_logs
     set status = coalesce(p_status, status),
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

-- Recreate error log hash validation function with public schema references
drop function if exists public.ai_generation_error_logs_before_insert_hash_validate() cascade;

create or replace function public.ai_generation_error_logs_before_insert_hash_validate()
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
      from public.ai_generation_logs
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

-- Recreate triggers to point at public schema objects
drop trigger if exists app_profiles_set_updated_at on public.profiles;
create trigger app_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists app_ai_generation_logs_set_updated_at on public.ai_generation_logs;
create trigger app_ai_generation_logs_set_updated_at
before update on public.ai_generation_logs
for each row
execute function public.set_updated_at();

drop trigger if exists app_flashcards_set_updated_at on public.flashcards;
create trigger app_flashcards_set_updated_at
before update on public.flashcards
for each row
execute function public.set_updated_at();

drop trigger if exists app_ai_generation_error_logs_set_updated_at on public.ai_generation_error_logs;
create trigger app_ai_generation_error_logs_set_updated_at
before update on public.ai_generation_error_logs
for each row
execute function public.set_updated_at();

drop trigger if exists app_flashcards_before_insert_limit on public.flashcards;
create trigger app_flashcards_before_insert_limit
before insert on public.flashcards
for each row
execute function public.enforce_flashcard_limit();

drop trigger if exists app_ai_generation_error_logs_before_insert_hash_validate on public.ai_generation_error_logs;
create trigger app_ai_generation_error_logs_before_insert_hash_validate
before insert on public.ai_generation_error_logs
for each row
execute function public.ai_generation_error_logs_before_insert_hash_validate();




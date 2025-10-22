-- migration purpose: restore privileges for anon/authenticated roles after moving tables to public schema
-- affected objects: schema public, tables public.profiles, public.flashcards, public.ai_generation_logs, public.ai_generation_error_logs

-- Ensure anon/authenticated roles can use the public schema
grant usage on schema public to anon, authenticated;

-- Grant CRUD privileges on key tables (RLS still applies)
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.flashcards to authenticated;
grant select, insert, update, delete on public.ai_generation_logs to authenticated;
grant select, insert, update, delete on public.ai_generation_error_logs to authenticated;

-- anon role only needs read access for public pages if ever exposed (keep minimal)
grant select on public.profiles to anon;
grant select on public.flashcards to anon;
grant select on public.ai_generation_logs to anon;
grant select on public.ai_generation_error_logs to anon;










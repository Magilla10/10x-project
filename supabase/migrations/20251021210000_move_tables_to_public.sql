-- migration purpose: move tables from app schema to public schema for PostgREST compatibility
-- affected objects: all tables, functions, triggers from app schema

-- Move tables to public schema
ALTER TABLE app.profiles SET SCHEMA public;
ALTER TABLE app.flashcards SET SCHEMA public;
ALTER TABLE app.ai_generation_logs SET SCHEMA public;
ALTER TABLE app.ai_generation_error_logs SET SCHEMA public;

-- Move types to public schema  
ALTER TYPE app.flashcard_source SET SCHEMA public;
ALTER TYPE app.ai_generation_status SET SCHEMA public;

-- Move functions to public schema
ALTER FUNCTION app.set_updated_at() SET SCHEMA public;
ALTER FUNCTION app.enforce_flashcard_limit() SET SCHEMA public;
ALTER FUNCTION app.log_ai_generation(uuid, public.ai_generation_status, integer, integer, integer, integer, integer, integer, text, varchar, integer) SET SCHEMA public;
ALTER FUNCTION app.ai_generation_error_logs_before_insert_hash_validate() SET SCHEMA public;
ALTER FUNCTION app.handle_new_user() SET SCHEMA public;

-- Drop app schema (it's now empty)
DROP SCHEMA IF EXISTS app CASCADE;




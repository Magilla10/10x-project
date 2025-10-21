import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient as BaseSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// Defer reading environment variables until the function is called so
// that server runtime (like Astro's middleware loader) doesn't throw
// during module evaluation when env vars might be undefined in some
// development scenarios.
export function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not set");
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

// Export typed SupabaseClient for use throughout the application
export type SupabaseClient = BaseSupabaseClient<Database>;

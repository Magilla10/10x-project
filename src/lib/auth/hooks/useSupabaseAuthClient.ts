import { useMemo } from "react";

import { createSupabaseClient, type SupabaseClient } from "@/db/supabase.client";

let browserClient: SupabaseClient | undefined;

export function useSupabaseAuthClient(): SupabaseClient {
  return useMemo(() => {
    if (browserClient) {
      return browserClient;
    }

    browserClient = createSupabaseClient();
    return browserClient;
  }, []);
}

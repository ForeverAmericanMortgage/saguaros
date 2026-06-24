import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/server-env";

export function createSupabaseAdminClient() {
  const serverEnv = getSupabaseServerEnv();

  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

"use client";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function createSupabaseBrowserClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey);
}

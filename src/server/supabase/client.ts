"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client. Returns a singleton.
 * Phase 0: types only; real auth wires in Phase 0/1 once env is set.
 */
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing. See .env.example.",
    );
  }
  if (!_client) {
    _client = createBrowserClient(url, anonKey);
  }
  return _client;
}

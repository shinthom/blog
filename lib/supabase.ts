import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Support both the new (sb_publishable_*) and legacy (anon) key names.
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && publicKey);

let cached: SupabaseClient | null = null;

export function getReadClient(): SupabaseClient | null {
  if (!url || !publicKey) return null;
  if (cached) return cached;
  cached = createClient(url, publicKey, {
    auth: { persistSession: false },
  });
  return cached;
}

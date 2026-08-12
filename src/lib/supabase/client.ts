import { createClient } from "@supabase/supabase-js";
import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Browser/client-side Supabase client (uses anon key).
 *
 * Backed by @supabase/ssr so the session is stored in **cookies**, not
 * localStorage. That is what lets `middleware.ts` see who is calling an
 * /api/admin or /api/platform route: a plain `fetch()` from an admin page sends
 * cookies automatically, but never sends a localStorage token.
 *
 * @supabase/ssr keeps one instance per (url, key) internally, so calling this on
 * every render — which most admin pages do — does not create a new client each
 * time.
 */
export function createBrowserClient() {
  return createSsrBrowserClient(supabaseUrl, supabaseAnonKey);
}

/** Server-side Supabase client (uses service role key — bypasses RLS). */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

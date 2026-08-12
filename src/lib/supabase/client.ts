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
  // createSsrBrowserClient throws on empty credentials, and this runs during
  // prerender of every admin client component. A misconfigured environment
  // should break the admin, not the whole build (and with it the storefront) —
  // so fall back to the plain client, which is inert without credentials.
  if (!supabaseUrl || !supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  return createSsrBrowserClient(supabaseUrl, supabaseAnonKey);
}

/** Server-side Supabase client (uses service role key — bypasses RLS). */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type CookiePair = { name: string; value: string };

/**
 * Parse a raw `Cookie:` header into the shape @supabase/ssr wants.
 *
 * Deliberately header-based rather than `next/headers` so this works for a
 * plain `Request` as well as a `NextRequest` — route handlers, middleware and
 * unit tests all pass through the same code path.
 */
function cookiesFromHeader(request: Request): CookiePair[] {
  const header = request.headers.get("cookie");
  if (!header) return [];

  const out: CookiePair[] = [];
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!name) continue;
    try {
      out.push({ name, value: decodeURIComponent(value) });
    } catch {
      out.push({ name, value });
    }
  }
  return out;
}

/**
 * Read-only, request-scoped Supabase client (anon key) that reads the auth
 * session from the request's cookies.
 *
 * Read-only on purpose: token refresh belongs in `middleware.ts`
 * (`updateSession`), which owns the response and can actually persist rotated
 * cookies. A route handler writing them here would silently drop them.
 *
 * Returns null when the environment is not configured, so callers fail closed.
 */
export function createRequestAuthClient(request: Request): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createSsrServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookiesFromHeader(request);
      },
      setAll() {
        /* no-op — see doc comment */
      },
    },
  });
}

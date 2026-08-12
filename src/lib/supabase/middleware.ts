import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * The @supabase/ssr "updateSession" pattern.
 *
 * Reads the auth cookies off the incoming request, verifies the user against
 * Supabase Auth, and — this is the part that matters — writes any *refreshed*
 * cookies back onto the response. Without the write-back an admin whose access
 * token expired (one hour) would be logged out mid-session even though the
 * refresh token is still valid.
 *
 * Returns the response the caller must keep using (or copy cookies from), plus
 * the authenticated user, or null when there is no valid cookie session.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  let response = NextResponse.next({ request });

  if (!supabaseUrl || !supabaseAnonKey) {
    // Misconfigured environment — never fail open.
    return { response, user: null };
  }

  const supabase = createSsrServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { response, user: user ?? null };
  } catch {
    return { response, user: null };
  }
}

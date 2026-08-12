import type { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { createRequestAuthClient } from "@/lib/supabase/server";

export type StaffIdentity = {
  id: string;
  role: string;
  name: string | null;
  email: string | null;
};

/**
 * The one definition of "is staff" in this codebase: a row in the `staff` table
 * whose auth_id is the authenticated Supabase user. Middleware and route
 * handlers both go through here so there is never a second, drifting notion.
 *
 * Uses the service-role client because `staff` is behind RLS.
 * Throws on lookup failure so callers can fail closed rather than fail open.
 */
export async function lookupStaffByAuthId(authId: string): Promise<StaffIdentity | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("staff")
    // name and email so a route can record who did something without a second
    // query — "modtaget af hvem" is worth nothing as a bare uuid.
    .select("id, role, name, email")
    .eq("auth_id", authId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`staff lookup failed: ${error.message}`);
  return (data as StaffIdentity | null) ?? null;
}

/** Verify an `Authorization: Bearer <supabase access token>` header. */
async function staffFromBearer(request: NextRequest | Request): Promise<StaffIdentity | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabase = createServerClient();
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return lookupStaffByAuthId(user.id);
}

/** Verify the @supabase/ssr cookie session on the request. */
async function staffFromCookies(request: NextRequest | Request): Promise<StaffIdentity | null> {
  const supabase = createRequestAuthClient(request);
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  return lookupStaffByAuthId(user.id);
}

/**
 * Verify the request comes from staff — either a valid staff **cookie** session
 * (the normal admin UI, since `fetch()` sends cookies automatically) or a valid
 * staff **Bearer** token (`staffFetch()` in src/lib/buyback/admin-fetch.ts).
 *
 * Returns the staff record, or null if unauthorized. Never throws: a lookup
 * error is treated as "not staff", which denies.
 */
export async function requireStaff(
  request: NextRequest | Request,
): Promise<StaffIdentity | null> {
  try {
    const viaBearer = await staffFromBearer(request);
    if (viaBearer) return viaBearer;
    return await staffFromCookies(request);
  } catch {
    return null;
  }
}

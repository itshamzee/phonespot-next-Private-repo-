import type { SupabaseClient } from "@supabase/supabase-js";

export type StaffRole = "employee" | "manager" | "owner";

export type StaffRow = {
  id: string;
  auth_id: string;
  role: StaffRole;
};

export type AuthUserInfo = {
  id: string;
  email: string | null | undefined;
};

/**
 * Emails that always get an `owner` staff row auto-provisioned, even if the
 * domain isn't @phonespot.dk. Add aliases here; keep the list short — every
 * entry here can access the admin panel.
 */
export const OWNER_EMAIL_WHITELIST: readonly string[] = [
  "hamza150668@gmail.com",
];

const OWNER_DOMAIN = "@phonespot.dk";

function isOwnerEmail(email: string): boolean {
  const lc = email.trim().toLowerCase();
  if (lc.endsWith(OWNER_DOMAIN)) return true;
  return OWNER_EMAIL_WHITELIST.includes(lc);
}

/**
 * Look up the staff row for a Supabase auth user. If the user is an
 * obvious owner (whitelisted email or @phonespot.dk domain) and no row
 * exists yet, insert one with role 'owner' and return it.
 *
 * Returns null for any other user — the caller should respond with 403.
 *
 * Uses an admin-privileged Supabase client so it can read and write the
 * staff table regardless of RLS.
 */
export async function resolveStaff(
  admin: SupabaseClient,
  user: AuthUserInfo,
): Promise<StaffRow | null> {
  const { data: existing, error: lookupError } = await admin
    .from("staff")
    .select("id, auth_id, role")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (lookupError) throw new Error(`staff lookup failed: ${lookupError.message}`);
  if (existing) return existing as StaffRow;

  if (!user.email) return null;
  if (!isOwnerEmail(user.email)) return null;

  const insertPayload = {
    auth_id: user.id,
    email: user.email,
    name: user.email.split("@")[0],
    role: "owner",
    is_active: true,
  };

  const { data: inserted, error } = await admin
    .from("staff")
    .insert(insertPayload)
    .select("id, auth_id, role")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      // Concurrent request already provisioned this row — re-read it.
      const { data: retry } = await admin
        .from("staff")
        .select("id, auth_id, role")
        .eq("auth_id", user.id)
        .single();
      return (retry as StaffRow | null) ?? null;
    }
    throw new Error(`staff insert failed: ${error.message}`);
  }
  return inserted as StaffRow;
}

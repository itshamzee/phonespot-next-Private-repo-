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
 * Emails that always get an `owner` staff row auto-provisioned (the one and
 * only super-admin). Add aliases here; keep the list short — every
 * entry here can access the admin panel.
 */
export const OWNER_EMAIL_WHITELIST: readonly string[] = [
  "hamza150668@gmail.com",
];

const COMPANY_DOMAIN = "@phonespot.dk";

function isOwnerEmail(email: string): boolean {
  return OWNER_EMAIL_WHITELIST.includes(email.trim().toLowerCase());
}

/**
 * Other @phonespot.dk addresses are provisioned as plain employees with NO
 * store. Ejeren er den eneste super-admin, så domænet må ikke give 'owner';
 * ejeren tildeler butik under Indstillinger > Medarbejdere.
 */
function isCompanyEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(COMPANY_DOMAIN);
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
  const owner = isOwnerEmail(user.email);
  if (!owner && !isCompanyEmail(user.email)) return null;

  const insertPayload = {
    auth_id: user.id,
    email: user.email,
    name: user.email.split("@")[0],
    role: owner ? "owner" : "employee",
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

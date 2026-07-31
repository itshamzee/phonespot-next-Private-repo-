import type { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * Verify the request has a valid staff Bearer token.
 * Returns the staff record or null if unauthorized.
 */
export async function requireStaff(request: NextRequest | Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabase = createServerClient();
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: staff } = await supabase
    .from("staff")
    // name and email so a route can record who did something without a second
    // query — "modtaget af hvem" is worth nothing as a bare uuid.
    .select("id, role, name, email")
    .eq("auth_id", user.id)
    .single();

  return staff;
}

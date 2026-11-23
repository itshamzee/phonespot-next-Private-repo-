import { createClient } from "@supabase/supabase-js";

/**
 * Er `password` den rigtige adgangskode til kontoen med `email`?
 *
 * Bruger sin egen Supabase-klient med anon-nøglen, uden at gemme eller forny
 * sessionen, så forespørgslens cookie-session og service role-klienterne aldrig
 * berøres. Den kortlivede session, som login giver, afsluttes bagefter (kun den
 * session: scope "local").
 */
export async function verifyStaffPassword(email: string | null, password: string): Promise<boolean> {
  if (!email || !password) return false;
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) return false;
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    // Bedst muligt: sessionen udløber alligevel af sig selv.
  }
  return true;
}

import { createBrowserClient } from "@/lib/supabase/client";

// Buyback admin routes are staff-gated with requireStaff(), which expects the
// staff session as a Bearer token. Browser code goes through here so every call
// site does not have to remember to attach it.
export async function staffHeaders(): Promise<Record<string, string>> {
  const supabase = createBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function staffFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const auth = await staffHeaders();
  return fetch(input, {
    ...init,
    headers: { ...(init.headers ?? {}), ...auth },
  });
}

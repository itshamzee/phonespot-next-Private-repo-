import { createBrowserClient } from "@/lib/supabase/client";
import { fetchInChunks } from "@/lib/supabase/in-chunks";

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

/**
 * Slutsedler læses kun via serveren (butiksadgang, maskering). Henter status pr.
 * henvendelse i portioner; fejl returneres, som fetchInChunks gør, så siderne
 * kan vise en banner i stedet for at tolke manglende rækker som "ingen sedler".
 */
export async function fetchReceiptsByInquiry<T>(
  ids: readonly string[],
): Promise<{ data: T[]; error: { message: string } | null }> {
  return fetchInChunks<T>(ids, async (chunk) => {
    try {
      const res = await staffFetch(`/api/trade-in/receipts?inquiry_ids=${chunk.join(",")}`);
      if (!res.ok) return { data: null, error: { message: `HTTP ${res.status}` } };
      return { data: (await res.json()) as T[], error: null };
    } catch (err) {
      return { data: null, error: { message: err instanceof Error ? err.message : "Network error" } };
    }
  });
}

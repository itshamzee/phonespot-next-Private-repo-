/** Fetch-hjælper til kataloghåndteringen: JSON ind, dansk fejlbesked ud (kaster Error med beskeden). */
export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new Error("Ingen forbindelse. Tjek nettet og prøv igen.");
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Noget gik galt. Prøv igen.");
  return json as T;
}

export const BASE = "/api/admin/repair-catalog";
export const MANAGE = `${BASE}/manage`;

/** Uploader et billede til den offentlige katalog-bucket og returnerer URL'en. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", "repair-models");
  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body: form });
  } catch {
    throw new Error("Ingen forbindelse. Tjek nettet og prøv igen.");
  }
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? "Billedet kunne ikke uploades");
  return json.url;
}

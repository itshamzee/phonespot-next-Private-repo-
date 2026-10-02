"use client";

import { createBrowserClient } from "@/lib/supabase/client";

/** fetch() against the /api/pos routes with the staff Bearer token (cookies are sent as well). */
export async function posFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const supabase = createBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(input, { ...init, headers });
}

export async function posJson<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await posFetch(input, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || "Noget gik galt");
  return body as T;
}

/** Opens a base64 PDF in a new tab and triggers print. */
export function printBase64Pdf(base64: string) {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const win = window.open(url, "_blank");
  if (win) win.addEventListener("load", () => win.print());
}

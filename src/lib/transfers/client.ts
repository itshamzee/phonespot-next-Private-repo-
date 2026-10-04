/** Lille fetch-hjælper til admin-dialogerne: JSON ind, dansk fejlbesked ud. */
export async function postJson<T = unknown>(
  url: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string } & T;
    if (!res.ok) return { ok: false, error: json.error ?? "Noget gik galt. Prøv igen.", status: res.status };
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: "Ingen forbindelse. Tjek nettet og prøv igen.", status: 0 };
  }
}

/** "35 123456 789012 3" -> "35 ••••••• 9012" til visning uden at afsløre hele IMEI'en. */
export function maskImei(imei: string | null | undefined): string {
  if (!imei) return "";
  const digits = imei.replace(/\s/g, "");
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 2)} ••••••• ${digits.slice(-4)}`;
}

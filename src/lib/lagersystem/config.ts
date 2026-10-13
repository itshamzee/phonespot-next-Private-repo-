export type LagersystemConfig = { url: string; apiKey: string };

/** null = funktionen er slået fra (spec §4.2: hemmeligheder kun i Vercel prod). */
export function getLagersystemConfig(env: NodeJS.ProcessEnv = process.env): LagersystemConfig | null {
  const rawUrl = env.LAGERSYSTEM_URL?.trim();
  const apiKey = env.LAGERSYSTEM_API_KEY?.trim();
  if (!rawUrl || !apiKey) return null;
  const url = rawUrl.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
  return { url, apiKey };
}

export function isLagersystemEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return getLagersystemConfig(env) !== null;
}

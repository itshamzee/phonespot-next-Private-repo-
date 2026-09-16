import type { createAdminClient } from "@/lib/supabase/admin";
import { MAIL_CATEGORIES, type MailAgentSettings, type MailCategory } from "./types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export const DEFAULT_MAIL_AGENT_SETTINGS: MailAgentSettings = {
  enabled: true,
  autoSendCategories: [],
  minConfidence: 0.85,
};

function sanitize(raw: Partial<MailAgentSettings> | undefined): MailAgentSettings {
  const cats = Array.isArray(raw?.autoSendCategories)
    ? raw.autoSendCategories.filter((c): c is MailCategory =>
        (MAIL_CATEGORIES as readonly string[]).includes(c),
      )
    : DEFAULT_MAIL_AGENT_SETTINGS.autoSendCategories;
  const min =
    typeof raw?.minConfidence === "number"
      ? Math.min(1, Math.max(0, raw.minConfidence))
      : DEFAULT_MAIL_AGENT_SETTINGS.minConfidence;
  return {
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : DEFAULT_MAIL_AGENT_SETTINGS.enabled,
    autoSendCategories: cats,
    minConfidence: min,
  };
}

export async function loadMailAgentSettings(client: SupabaseAdmin): Promise<MailAgentSettings> {
  const { data } = await client.from("app_settings").select("value").eq("key", "mail_agent").maybeSingle();
  return sanitize((data as { value?: Partial<MailAgentSettings> } | null)?.value);
}

export async function saveMailAgentSettings(
  client: SupabaseAdmin,
  patch: Partial<MailAgentSettings>,
): Promise<MailAgentSettings> {
  const current = await loadMailAgentSettings(client);
  const next = sanitize({ ...current, ...patch });
  await client
    .from("app_settings")
    .upsert({ key: "mail_agent", value: next, updated_at: new Date().toISOString() });
  return next;
}

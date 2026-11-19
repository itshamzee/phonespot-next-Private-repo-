import { repairDiscountIsCampaign, repairDiscountPercent } from "@/lib/campaign/black-november";
import { REPAIR_QUALITY_LABELS, type RepairQuality } from "@/lib/repairs/new-case-types";
import type { ToolContext } from "./tools";

export interface MatchModel {
  id: string;
  name: string;
  brand: string;
}

const BRAND_WORDS = new Set(["apple", "samsung"]);

/** Lower case, hyphens and repeated spaces collapsed, optional brand word and "galaxy" dropped. */
function normalizeTokens(s: string): string[] {
  const tokens = s
    .toLowerCase()
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length > 1 && BRAND_WORDS.has(tokens[0])) tokens.shift();
  return tokens.filter((t) => t !== "galaxy");
}

export function matchRepairModels(query: string, models: MatchModel[]): MatchModel[] {
  const q = normalizeTokens(query);
  if (!q.length) return [];
  const qKey = q.join(" ");
  const exact = models.filter((m) => normalizeTokens(m.name).join(" ") === qKey);
  if (exact.length === 1) return exact;
  return models.filter((m) => {
    const tokens = new Set(normalizeTokens(m.name));
    return q.every((t) => tokens.has(t));
  });
}

type Row = Record<string, unknown>;

function kr(amount: number): string {
  return `${Math.round(amount).toLocaleString("da-DK")} kr.`;
}

/** Public price data: no sender verification needed. Shop stock is not included (prices are equal in all shops). */
export async function quoteRepairImpl(
  ctx: ToolContext,
  input: { model: string; category?: string },
  now: number = Date.now(),
): Promise<string> {
  const { data: modelRows } = await ctx.supabase
    .from("repair_models")
    .select("id, name, repair_brands(name)")
    .eq("active", true);
  const models: MatchModel[] = ((modelRows ?? []) as Row[]).map((r) => {
    const b = r.repair_brands as { name?: string } | { name?: string }[] | null | undefined;
    const brand = (Array.isArray(b) ? b[0]?.name : b?.name) ?? "";
    return { id: String(r.id), name: String(r.name), brand };
  });

  const hits = matchRepairModels(input.model, models);
  ctx.log.push({ tool: "quote_repair", input, hits: hits.length });

  if (hits.length === 0) {
    return `Ingen model fundet for "${input.model}". Henvis kunden til phonespot.dk/reparation, hvor modellen kan vælges, eller bed om det præcise modelnavn.`;
  }
  if (hits.length > 1) {
    return `Flere modeller passer: ${hits.map((m) => m.name).join(", ")}. Spørg kunden hvilken model det er, før du oplyser en pris.`;
  }

  const model = hits[0];
  const { data: serviceRows } = await ctx.supabase
    .from("repair_services")
    .select("model_id, name, price_dkk, quality_tier, estimated_minutes, service_category, active, sort_order")
    .eq("model_id", model.id)
    .eq("active", true)
    .order("sort_order");
  const services = ((serviceRows ?? []) as Row[]).filter((s) => Number(s.price_dkk) > 0);

  const percent = repairDiscountPercent(1, now);
  const campaign = repairDiscountIsCampaign(1, now) && percent > 0;
  const shown = (price: number) => Math.round(price * (1 - percent / 100));

  const byCategory = new Map<string, Row[]>();
  for (const s of services) {
    const cat = String(s.service_category ?? "Andet");
    byCategory.set(cat, [...(byCategory.get(cat) ?? []), s]);
  }

  if (input.category) {
    const want = input.category.trim().toLowerCase();
    const key = [...byCategory.keys()].find((k) => k.toLowerCase() === want);
    if (!key) {
      return `${model.name}: ingen pris på "${input.category}" i prislisten. Henvis til phonespot.dk/reparation eller foreslå gratis diagnose i butikken.`;
    }
    const lines = byCategory.get(key)!.map((s) => {
      const price = Number(s.price_dkk);
      const tier = s.quality_tier ? REPAIR_QUALITY_LABELS[s.quality_tier as RepairQuality] : null;
      const minutes = Number(s.estimated_minutes);
      const parts = [
        `${s.name}${tier ? ` (${tier})` : ""}: ${kr(shown(price))}`,
        campaign ? `kampagnepris (Black November -${percent} %), normalpris ${kr(price)}` : null,
        minutes > 0 ? `ca. ${minutes} min.` : null,
      ].filter(Boolean);
      return `- ${parts.join(", ")}`;
    });
    return `${model.name} - ${key}:\n${lines.join("\n")}`;
  }

  if (!byCategory.size) return `${model.name}: ingen priser i prislisten endnu.`;
  const lines = [...byCategory.entries()].map(([cat, rows]) => {
    const min = Math.min(...rows.map((s) => Number(s.price_dkk)));
    return `- ${cat}: fra ${kr(shown(min))}${campaign ? ` (kampagnepris, normalpris fra ${kr(min)})` : ""}`;
  });
  return `${model.name}:\n${lines.join("\n")}`;
}

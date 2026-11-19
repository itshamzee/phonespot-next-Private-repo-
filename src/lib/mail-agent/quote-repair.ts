import { repairDiscountIsCampaign, repairDiscountPercent } from "@/lib/campaign/black-november";
import { countsTowardFromPrice } from "@/lib/repairs/from-price";
import { SUMMARY_CATEGORIES } from "@/lib/repairs/price-list";
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

export interface ModelMatch {
  /** Set only when exactly one model's normalised name equals the normalised query. */
  exact: MatchModel | null;
  /** Every model whose name contains all query tokens (includes the exact hit). */
  candidates: MatchModel[];
}

export function matchRepairModels(query: string, models: MatchModel[]): ModelMatch {
  const q = normalizeTokens(query);
  if (!q.length) return { exact: null, candidates: [] };
  const qKey = q.join(" ");
  const exactHits = models.filter((m) => normalizeTokens(m.name).join(" ") === qKey);
  const candidates = models.filter((m) => {
    const tokens = new Set(normalizeTokens(m.name));
    return q.every((t) => tokens.has(t));
  });
  return { exact: exactHits.length === 1 ? exactHits[0] : null, candidates };
}

const TECH_ERROR = "Prisopslaget fejlede teknisk. Oplys ingen pris, og lad en medarbejder tage over.";
const MAX_CANDIDATES = 8;

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
  const { data: modelRows, error: modelError } = await ctx.supabase
    .from("repair_models")
    .select("id, name, repair_brands(name)")
    .eq("active", true);
  if (modelError) {
    console.error("quote_repair: model query failed", modelError);
    return TECH_ERROR;
  }
  const models: MatchModel[] = ((modelRows ?? []) as Row[]).map((r) => {
    const b = r.repair_brands as { name?: string } | { name?: string }[] | null | undefined;
    const brand = (Array.isArray(b) ? b[0]?.name : b?.name) ?? "";
    return { id: String(r.id), name: String(r.name), brand };
  });

  const { exact, candidates } = matchRepairModels(input.model, models);
  ctx.log.push({ tool: "quote_repair", input, hits: exact ? 1 : candidates.length });

  if (!exact) {
    if (candidates.length === 0) {
      return `Ingen model fundet for "${input.model}". Henvis kunden til phonespot.dk/reparation, hvor modellen kan vælges, eller bed om det præcise modelnavn.`;
    }
    if (candidates.length === 1) {
      return `Mente du ${candidates[0].name}? Spørg kunden, før du oplyser en pris.`;
    }
    const shownNames = candidates.slice(0, MAX_CANDIDATES).map((m) => m.name).join(", ");
    const more =
      candidates.length > MAX_CANDIDATES ? ` ...og ${candidates.length - MAX_CANDIDATES} flere. Bed kunden om den præcise model.` : "";
    return `Flere modeller passer: ${shownNames}.${more} Spørg kunden hvilken model det er, før du oplyser en pris.`;
  }

  const model = exact;
  const { data: serviceRows, error: serviceError } = await ctx.supabase
    .from("repair_services")
    .select("model_id, slug, name, price_dkk, quality_tier, estimated_minutes, service_category, active, sort_order")
    .eq("model_id", model.id)
    .eq("active", true)
    .order("sort_order");
  if (serviceError) {
    console.error("quote_repair: service query failed", serviceError);
    return TECH_ERROR;
  }
  const services = ((serviceRows ?? []) as Row[]).filter((s) =>
    countsTowardFromPrice({
      price_dkk: Number(s.price_dkk),
      service_category: s.service_category as string | null,
      name: s.name as string | null,
      slug: s.slug as string | null,
    }),
  );

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
      const rawTier = s.quality_tier ? REPAIR_QUALITY_LABELS[s.quality_tier as RepairQuality] : null;
      const tier = rawTier && !String(s.name).toLowerCase().includes(rawTier.toLowerCase()) ? rawTier : null;
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

  if (!(SUMMARY_CATEGORIES as readonly string[]).some((c) => byCategory.has(c))) {
    return `${model.name}: ingen priser i prislisten endnu.`;
  }
  const lines = [...byCategory.entries()]
    .filter(([cat]) => (SUMMARY_CATEGORIES as readonly string[]).includes(cat))
    .map(([cat, rows]) => {
    const min = Math.min(...rows.map((s) => Number(s.price_dkk)));
    return `- ${cat}: fra ${kr(shown(min))}${campaign ? ` (kampagnepris, normalpris fra ${kr(min)})` : ""}`;
  });
  return `${model.name}:\n${lines.join("\n")}`;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import { z } from "zod";
import { buildKnowledge } from "./knowledge";
import { escapeLike } from "./like";
import { SUMMARY_CATEGORIES } from "@/lib/repairs/price-list";
import { quoteBuybackImpl, type QuoteBuybackInput } from "./quote-buyback";
import { quoteRepairImpl } from "./quote-repair";
import { assessmentSchema } from "./schema";
import { SYMPTOMS, diagnoseImpl } from "./symptoms";
import type { LookupLog } from "./types";

/**
 * Read-only lookups the agent may call. Every lookup is scoped to the sender's
 * address: a record that belongs to someone else is reported as a mismatch,
 * never described, and forces the mail to a human.
 */
export interface ToolContext {
  supabase: SupabaseClient;
  /** Lowercase addresses the sender has proven control of. Empty = anonymous sender. */
  verified: { emails: string[] };
  log: LookupLog[];
  /** Every tool's returned text, for the amount filter. */
  outputs: string[];
  scopeMismatch: { value: boolean };
}

const MISMATCH =
  "Fundet, men registreret på en anden adresse end afsenderens. Oplys ikke detaljer; bed kunden skrive fra den mail der er brugt ved købet, eller lad en medarbejder tage over.";

const NOT_VERIFIED =
  "Afsenderen er ikke verificeret på denne kanal. Oplys ingen ordre-, sags- eller kundeoplysninger; bed kunden skrive fra den mailadresse, der er brugt ved købet, eller ringe til butikken.";

/** Shared guard: anonymous senders get no personal data and the mail goes to a human. */
function unverified(ctx: ToolContext): boolean {
  if (ctx.verified.emails.length > 0) return false;
  ctx.scopeMismatch.value = true;
  return true;
}

const ORDER_STATUS: Record<string, string> = {
  pending: "afventer betaling",
  confirmed: "bekræftet, pakkes",
  shipped: "afsendt",
  picked_up: "afhentet",
  delivered: "leveret",
  cancelled: "annulleret",
  refunded: "refunderet",
};

type Row = Record<string, unknown>;

function kr(ore: number | null | undefined): string {
  if (ore == null) return "-";
  return `${(ore / 100).toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr.`;
}

function day(v: unknown): string {
  return v ? String(v).slice(0, 10) : "-";
}

/**
 * Customer ids for the verified addresses. The address is escaped for ilike and
 * the returned row's email is re-checked; a row that is not the sender's sets
 * scopeMismatch and is dropped.
 */
async function customerIdsFor(ctx: ToolContext): Promise<{ ids: string[]; mismatch: boolean }> {
  const ids: string[] = [];
  let mismatch = false;
  for (const e of ctx.verified.emails) {
    const { data } = await ctx.supabase.from("customers").select("id, email").ilike("email", escapeLike(e)).maybeSingle();
    if (!data) continue;
    if (!ctx.verified.emails.includes(String(data.email ?? "").toLowerCase())) {
      ctx.scopeMismatch.value = true;
      mismatch = true;
      continue;
    }
    const id = data.id as string;
    if (!ids.includes(id)) ids.push(id);
  }
  return { ids, mismatch };
}

function formatOrders(orders: Row[]): string {
  return orders
    .map((o) =>
      [
        `Ordre ${o.order_number} (${day(o.created_at)}): ${ORDER_STATUS[String(o.status)] ?? o.status}, total ${kr(o.total as number)}`,
        o.shipping_method ? `  Levering: ${o.shipping_method}` : null,
        o.tracking_number ? `  Sporingsnummer: ${o.tracking_number}` : null,
        o.shipped_at ? `  Afsendt: ${day(o.shipped_at)}` : null,
        o.delivered_at ? `  Leveret: ${day(o.delivered_at)}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

async function orderOwnerEmail(sb: SupabaseClient, order: Row): Promise<string | null> {
  if (typeof order.customer_email === "string") return order.customer_email.toLowerCase();
  if (!order.customer_id) return null;
  const { data } = await sb.from("customers").select("email").eq("id", order.customer_id).maybeSingle();
  return (data?.email as string | undefined)?.toLowerCase() ?? null;
}

export async function lookupOrdersImpl(ctx: ToolContext, input: { order_number?: string }): Promise<string> {
  if (unverified(ctx)) return NOT_VERIFIED;
  const sb = ctx.supabase;

  if (input.order_number) {
    const { data: order } = await sb
      .from("orders")
      .select("*")
      .ilike("order_number", escapeLike(input.order_number.trim()))
      .maybeSingle();
    ctx.log.push({ tool: "lookup_orders", input, hits: order ? 1 : 0 });
    if (!order) return `Ingen ordre med nummer ${input.order_number}.`;
    const owner = await orderOwnerEmail(sb, order as Row);
    if (!owner || !ctx.verified.emails.includes(owner)) {
      ctx.scopeMismatch.value = true;
      return MISMATCH;
    }
    return formatOrders([order as Row]);
  }

  const { ids: customerIds, mismatch } = await customerIdsFor(ctx);
  if (!customerIds.length) {
    ctx.log.push({ tool: "lookup_orders", input, hits: 0 });
    return mismatch ? MISMATCH : "Ingen ordrer registreret på afsenderens adresse.";
  }
  const orders: Row[] = [];
  for (const customerId of customerIds) {
    const { data } = await sb
      .from("orders")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(5);
    orders.push(...((data ?? []) as Row[]));
  }
  orders.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  orders.splice(5);
  ctx.log.push({ tool: "lookup_orders", input, hits: orders.length });
  return orders.length ? formatOrders(orders) : "Ingen ordrer registreret på afsenderens adresse.";
}

export async function lookupRepairsImpl(ctx: ToolContext, input: { phone?: string }): Promise<string> {
  if (unverified(ctx)) return NOT_VERIFIED;
  const sb = ctx.supabase;
  const base = () =>
    sb
      .from("repair_tickets")
      .select("id, device_model, issue_description, status, created_at, updated_at, customer_email, customer_phone")
      .order("created_at", { ascending: false })
      .limit(5);
  const rows: Row[] = [];
  if (input.phone) {
    const { data } = await base().eq("customer_phone", input.phone);
    rows.push(...((data ?? []) as Row[]));
  } else {
    for (const email of ctx.verified.emails) {
      const { data } = await base().ilike("customer_email", escapeLike(email));
      rows.push(...((data ?? []) as Row[]));
    }
  }
  const mine = rows.filter((r) => ctx.verified.emails.includes(String(r.customer_email ?? "").toLowerCase()));

  if (mine.length < rows.length) ctx.scopeMismatch.value = true;
  if (rows.length && mine.length === 0) {
    ctx.log.push({ tool: "lookup_repairs", input, hits: rows.length });
    return MISMATCH;
  }
  ctx.log.push({ tool: "lookup_repairs", input, hits: mine.length });
  if (!mine.length) return "Ingen reparationssager på afsenderens adresse.";
  return mine
    .map(
      (r) =>
        `Sag ${String(r.id).slice(0, 8)} (${day(r.created_at)}): ${r.device_model ?? "enhed"} – ${r.issue_description ?? ""}. Status: ${r.status}. Sidst opdateret ${day(r.updated_at)}.`,
    )
    .join("\n");
}

export async function lookupBuybackImpl(ctx: ToolContext): Promise<string> {
  if (unverified(ctx)) return NOT_VERIFIED;
  const sb = ctx.supabase;
  const lines: string[] = [];

  let mismatch = false;
  const inquiries: Row[] = [];
  for (const email of ctx.verified.emails) {
    const { data } = await sb
      .from("contact_inquiries")
      .select("id, subject, status, created_at, email")
      .ilike("email", escapeLike(email))
      .eq("source", "saelg-enhed")
      .order("created_at", { ascending: false })
      .limit(3);
    for (const r of (data ?? []) as Row[]) {
      if (ctx.verified.emails.includes(String(r.email ?? "").toLowerCase())) inquiries.push(r);
      else mismatch = true;
    }
  }
  for (const i of inquiries) {
    const { data: offers } = await sb
      .from("trade_in_offers")
      .select("offer_amount, status, created_at, responded_at")
      .eq("inquiry_id", i.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const o = ((offers ?? []) as Row[])[0];
    lines.push(
      `Salgsforespørgsel ${day(i.created_at)}: ${i.subject ?? "enhed"}. ${o ? `Tilbud ${kr(o.offer_amount as number)} (${o.status})` : "Intet tilbud sendt endnu"}.`,
    );
  }

  const customers = await customerIdsFor(ctx);
  if (customers.mismatch) mismatch = true;
  if (mismatch) ctx.scopeMismatch.value = true;
  for (const customerId of customers.ids) {
    const { data: tradeIns } = await sb
      .from("trade_ins")
      .select("device_description, offered_price, status, received_at, paid_at, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(3);
    for (const t of (tradeIns ?? []) as Row[]) {
      lines.push(
        `Opkøb ${day(t.created_at)}: ${t.device_description}, ${kr(t.offered_price as number)}, status ${t.status}${t.received_at ? ", modtaget" : ""}${t.paid_at ? ", udbetalt" : ""}.`,
      );
    }
  }

  ctx.log.push({ tool: "lookup_buyback", input: {}, hits: lines.length });
  if (!lines.length && mismatch) return MISMATCH;
  return lines.length ? lines.join("\n") : "Ingen salgsforespørgsler eller opkøb på afsenderens adresse.";
}

export async function lookupCustomerImpl(ctx: ToolContext): Promise<string> {
  if (unverified(ctx)) return NOT_VERIFIED;
  let data: Row | null = null;
  let mismatch = false;
  for (const email of ctx.verified.emails) {
    const res = await ctx.supabase
      .from("customers")
      .select("id, name, created_at, email")
      .ilike("email", escapeLike(email))
      .maybeSingle();
    if (!res.data) continue;
    if (!ctx.verified.emails.includes(String(res.data.email ?? "").toLowerCase())) {
      ctx.scopeMismatch.value = true;
      mismatch = true;
      continue;
    }
    data = res.data as Row;
    break;
  }
  ctx.log.push({ tool: "lookup_customer", input: {}, hits: data ? 1 : 0 });
  if (!data && mismatch) return MISMATCH;
  if (!data) return "Ukendt kunde – ingen profil på adressen.";
  const { count } = await ctx.supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", data.id as string);
  return `Kunde: ${data.name ?? "(uden navn)"}, oprettet ${day(data.created_at)}, ${count ?? 0} ordrer.`;
}

export function buildTools(ctx: ToolContext, onAssessment: (a: unknown) => void): BetaRunnableTool[] {
  /** Records every returned text in ctx.outputs. */
  const rec =
    <A extends unknown[]>(fn: (...args: A) => Promise<string>) =>
    async (...args: A): Promise<string> => {
      const out = await fn(...args);
      ctx.outputs.push(out);
      return out;
    };
  return [
    betaZodTool({
      name: "lookup_orders",
      description:
        "Slå afsenderens ordrer op. Uden ordrenummer: seneste 5 ordrer på afsenderens mail. Med ordrenummer: den ordre, hvis den tilhører afsenderen.",
      inputSchema: z.object({
        order_number: z.string().optional().describe("Ordrenummer som kunden nævner, fx PS-1001"),
      }),
      run: rec((input: { order_number?: string }) => lookupOrdersImpl(ctx, input)),
    }),
    betaZodTool({
      name: "lookup_repairs",
      description: "Slå afsenderens reparationssager op via mail, eller via telefonnummer hvis kunden nævner det.",
      inputSchema: z.object({
        phone: z.string().optional().describe("Telefonnummer hvis kunden nævner det"),
      }),
      run: rec((input: { phone?: string }) => lookupRepairsImpl(ctx, input)),
    }),
    betaZodTool({
      name: "lookup_buyback",
      description: "Slå afsenderens salgsforespørgsler, tilbud og opkøb op (Sælg din enhed).",
      inputSchema: z.object({}),
      run: rec(() => lookupBuybackImpl(ctx)),
    }),
    betaZodTool({
      name: "lookup_customer",
      description: "Slå afsenderens kundeprofil op: navn, oprettet, antal ordrer.",
      inputSchema: z.object({}),
      run: rec(() => lookupCustomerImpl(ctx)),
    }),
    betaZodTool({
      name: "quote_repair",
      description:
        "Slå reparationspris og varighed op for en model. Brug kategori når du kender fejlen. Returnerer flere modeller, hvis navnet er tvetydigt; spørg da kunden.",
      inputSchema: z.object({
        model: z.string().describe("Modelnavn som kunden nævner, fx iPhone 13 Pro"),
        category: z.enum(SUMMARY_CATEGORIES).optional().describe("Reparationskategori når du kender fejlen"),
      }),
      run: rec((input: { model: string; category?: string }) => quoteRepairImpl(ctx, input)),
    }),
    betaZodTool({
      name: "quote_buyback",
      description:
        "Vejledende opkøbspris for en iPhone ud fra model, lagerplads og stand. Spørg kunden om det, du mangler, før du kalder.",
      inputSchema: z.object({
        model: z.string().describe("Modelnavn, fx iPhone 13 Pro"),
        storage: z.string().describe("Lagerplads, fx 128GB eller 1TB"),
        screen: z.enum(["Perfekt", "Små ridser", "Revnet", "Virker ikke"]).describe("Skærmens stand"),
        back: z.enum(["Perfekt", "Små ridser", "Revnet"]).describe("Bagsidens stand"),
        battery: z.enum(["God (80%+)", "Okay (60-80%)", "Dårligt (<60%)", "Ved ikke"]).describe("Batteriets tilstand"),
        charging_broken: z.boolean().describe("Virker opladning ikke?"),
        other_faults: z.boolean().describe("Er der andre fejl end opladning (kamera, højttaler, Face ID, tænder ikke osv.)?"),
        cloud_locked: z.enum(["Ja", "Nej", "Ved ikke"]).describe("Er enheden låst til iCloud?"),
      }),
      run: rec((input: QuoteBuybackInput) => quoteBuybackImpl(ctx, input)),
    }),
    betaZodTool({
      name: "diagnose",
      description: `Koble en beskrevet fejl til en reparationskategori. Vælg den række, der passer bedst: ${SYMPTOMS.map((s) => `${s.key}: ${s.label}`).join("; ")}. Kald derefter quote_repair for pris, hvis svaret beder om det.`,
      inputSchema: z.object({
        symptom_key: z.enum(SYMPTOMS.map((s) => s.key) as [string, ...string[]]),
      }),
      run: rec((input: { symptom_key: string }) => diagnoseImpl(ctx, input)),
    }),
    betaZodTool({
      name: "get_knowledge",
      description:
        "Hent PhoneSpots faktabase: butikker, åbningstider, garanti, retur, levering, opkøb, forsikring og ordvalg.",
      inputSchema: z.object({}),
      run: rec(async () => {
        ctx.log.push({ tool: "get_knowledge", input: {}, hits: 1 });
        return buildKnowledge();
      }),
    }),
    betaZodTool({
      name: "submit_assessment",
      description: "Afslut med din vurdering af mailen. Kald dette præcis én gang som sidste handling.",
      inputSchema: assessmentSchema,
      run: async (input) => {
        onAssessment(input);
        return "Vurdering modtaget.";
      },
    }),
  ] as BetaRunnableTool[];
}

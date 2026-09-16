import type { SupabaseClient } from "@supabase/supabase-js";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import { z } from "zod";
import { buildKnowledge } from "./knowledge";
import { assessmentSchema } from "./schema";
import type { LookupLog } from "./types";

/**
 * Read-only lookups the agent may call. Every lookup is scoped to the sender's
 * address: a record that belongs to someone else is reported as a mismatch,
 * never described, and forces the mail to a human.
 */
export interface ToolContext {
  supabase: SupabaseClient;
  senderEmail: string;
  log: LookupLog[];
  scopeMismatch: { value: boolean };
}

const MISMATCH =
  "Fundet, men registreret på en anden adresse end afsenderens. Oplys ikke detaljer; bed kunden skrive fra den mail der er brugt ved købet, eller lad en medarbejder tage over.";

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

async function customerIdFor(sb: SupabaseClient, email: string): Promise<string | null> {
  const { data } = await sb.from("customers").select("id").ilike("email", email).maybeSingle();
  return (data?.id as string | undefined) ?? null;
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
  const sb = ctx.supabase;
  const email = ctx.senderEmail.toLowerCase();

  if (input.order_number) {
    const { data: order } = await sb
      .from("orders")
      .select("*")
      .ilike("order_number", input.order_number.trim())
      .maybeSingle();
    ctx.log.push({ tool: "lookup_orders", input, hits: order ? 1 : 0 });
    if (!order) return `Ingen ordre med nummer ${input.order_number}.`;
    const owner = await orderOwnerEmail(sb, order as Row);
    if (owner !== email) {
      ctx.scopeMismatch.value = true;
      return MISMATCH;
    }
    return formatOrders([order as Row]);
  }

  const customerId = await customerIdFor(sb, email);
  if (!customerId) {
    ctx.log.push({ tool: "lookup_orders", input, hits: 0 });
    return "Ingen ordrer registreret på afsenderens adresse.";
  }
  const { data } = await sb
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(5);
  const orders = (data ?? []) as Row[];
  ctx.log.push({ tool: "lookup_orders", input, hits: orders.length });
  return orders.length ? formatOrders(orders) : "Ingen ordrer registreret på afsenderens adresse.";
}

export async function lookupRepairsImpl(ctx: ToolContext, input: { phone?: string }): Promise<string> {
  const sb = ctx.supabase;
  const email = ctx.senderEmail.toLowerCase();
  const base = sb
    .from("repair_tickets")
    .select("id, device_model, issue_description, status, created_at, updated_at, customer_email, customer_phone")
    .order("created_at", { ascending: false })
    .limit(5);
  const { data } = input.phone ? await base.eq("customer_phone", input.phone) : await base.ilike("customer_email", email);
  const rows = (data ?? []) as Row[];
  const mine = rows.filter((r) => String(r.customer_email ?? "").toLowerCase() === email);

  if (rows.length && mine.length === 0) {
    ctx.scopeMismatch.value = true;
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
  const sb = ctx.supabase;
  const email = ctx.senderEmail.toLowerCase();
  const lines: string[] = [];

  const { data: inquiries } = await sb
    .from("contact_inquiries")
    .select("id, subject, status, created_at")
    .ilike("email", email)
    .eq("source", "saelg-enhed")
    .order("created_at", { ascending: false })
    .limit(3);
  for (const i of (inquiries ?? []) as Row[]) {
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

  const customerId = await customerIdFor(sb, email);
  if (customerId) {
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
  return lines.length ? lines.join("\n") : "Ingen salgsforespørgsler eller opkøb på afsenderens adresse.";
}

export async function lookupCustomerImpl(ctx: ToolContext): Promise<string> {
  const { data } = await ctx.supabase
    .from("customers")
    .select("id, name, created_at")
    .ilike("email", ctx.senderEmail.toLowerCase())
    .maybeSingle();
  ctx.log.push({ tool: "lookup_customer", input: {}, hits: data ? 1 : 0 });
  if (!data) return "Ukendt kunde – ingen profil på adressen.";
  const { count } = await ctx.supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", data.id);
  return `Kunde: ${data.name ?? "(uden navn)"}, oprettet ${day(data.created_at)}, ${count ?? 0} ordrer.`;
}

export function buildTools(ctx: ToolContext, onAssessment: (a: unknown) => void): BetaRunnableTool[] {
  return [
    betaZodTool({
      name: "lookup_orders",
      description:
        "Slå afsenderens ordrer op. Uden ordrenummer: seneste 5 ordrer på afsenderens mail. Med ordrenummer: den ordre, hvis den tilhører afsenderen.",
      inputSchema: z.object({
        order_number: z.string().optional().describe("Ordrenummer som kunden nævner, fx PS-1001"),
      }),
      run: (input) => lookupOrdersImpl(ctx, input),
    }),
    betaZodTool({
      name: "lookup_repairs",
      description: "Slå afsenderens reparationssager op via mail, eller via telefonnummer hvis kunden nævner det.",
      inputSchema: z.object({
        phone: z.string().optional().describe("Telefonnummer hvis kunden nævner det"),
      }),
      run: (input) => lookupRepairsImpl(ctx, input),
    }),
    betaZodTool({
      name: "lookup_buyback",
      description: "Slå afsenderens salgsforespørgsler, tilbud og opkøb op (Sælg din enhed).",
      inputSchema: z.object({}),
      run: () => lookupBuybackImpl(ctx),
    }),
    betaZodTool({
      name: "lookup_customer",
      description: "Slå afsenderens kundeprofil op: navn, oprettet, antal ordrer.",
      inputSchema: z.object({}),
      run: () => lookupCustomerImpl(ctx),
    }),
    betaZodTool({
      name: "get_knowledge",
      description:
        "Hent PhoneSpots faktabase: butikker, åbningstider, garanti, retur, levering, opkøb, forsikring og ordvalg.",
      inputSchema: z.object({}),
      run: async () => {
        ctx.log.push({ tool: "get_knowledge", input: {}, hits: 1 });
        return buildKnowledge();
      },
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

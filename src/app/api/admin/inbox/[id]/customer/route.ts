import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireInquiryAccess } from "@/lib/inquiries/inquiry-access";
import {
  applyLocationScope,
  applyStoreScope,
  loadLocationIndex,
  scopeForRequest,
} from "@/lib/auth/store-scope-server";
import { escapeLike, hasLikeWildcardStar } from "@/lib/mail-agent/like";

const NO_STORE = { "Cache-Control": "no-store" };
const FETCH = 25; // hent bredt, efterkontrollér, og klip til visningsantallet

/** Kun cifre; et ledende 45 (landekode) fjernes. Under 8 cifre er ikke et brugbart nummer. */
function digitsOf(phone: string | null | undefined): string {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.length > 8 && d.startsWith("45")) d = d.slice(2);
  return d;
}

type Identity = { emails: string[]; digits: string | null };
type Row = Record<string, unknown>;

/** Efterkontrol: rækken skal have præcis samme mail (små bogstaver) eller samme cifre i telefonen. */
function isSame(row: Row, who: Identity, emailCol: string, phoneCol: string | null): boolean {
  const email = String(row[emailCol] ?? "").trim().toLowerCase();
  if (email && who.emails.includes(email)) return true;
  if (phoneCol && who.digits && digitsOf(row[phoneCol] as string | null) === who.digits) return true;
  return false;
}

/** ILIKE-mønster der finder cifrene med vilkårlig formatering imellem; resultatet efterkontrolleres. */
const phonePattern = (digits: string) => `%${digits.split("").join("%")}%`;

/**
 * Kører et opslag pr. mail og pr. telefon, slår dem sammen på id og efterkontrollerer hver række.
 */
async function lookup(
  who: Identity,
  emailCol: string,
  phoneCol: string | null,
  build: (col: string, pattern: string) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<Row[]> {
  const seen = new Map<string, Row>();
  const add = (rows: unknown) => {
    for (const r of (rows ?? []) as Row[]) if (isSame(r, who, emailCol, phoneCol)) seen.set(String(r.id), r);
  };
  for (const email of who.emails) {
    const res = await build(emailCol, escapeLike(email));
    if (res.error) throw res.error;
    add(res.data);
  }
  if (phoneCol && who.digits) {
    const res = await build(phoneCol, phonePattern(who.digits));
    if (res.error) throw res.error;
    add(res.data);
  }
  return [...seen.values()].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
}

/**
 * GET /api/admin/inbox/[id]/customer — hvad vi ved om afsenderen: reparationer,
 * ordrer, opkøb og tidligere samtaler. Kun for kanaler med en verificeret afsender.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireInquiryAccess(request, id);
  if (!access.ok) return access.response;

  const sb = createServerClient();
  const { data: inq, error } = await sb
    .from("contact_inquiries")
    .select("id, name, email, phone, channel")
    .eq("id", id)
    .maybeSingle();
  if (error || !inq) {
    if (error) console.error("[admin/inbox] customer load failed:", id, error.message);
    return NextResponse.json({ error: error ? "Kunne ikke hente kunden" : "Henvendelse ikke fundet" }, { status: error ? 500 : 404 });
  }

  const base = {
    name: (inq.name as string | null) ?? null,
    email: (inq.email as string | null) ?? null,
    phone: (inq.phone as string | null) ?? null,
  };
  const empty = { known: false, ...base, repairs: [], orders: [], buyback: [], previous: [] };

  // Kun kanaler hvor afsenderen er verificeret: mail/formular (mail) og SMS (telefon).
  const channel = (inq.channel as string | null) ?? "email";
  const emailKnown = channel === "email" || channel === "form";
  const phoneKnown = emailKnown || channel === "sms";
  const emails = emailKnown
    ? [String(inq.email ?? "").trim().toLowerCase()].filter((e) => e && !hasLikeWildcardStar(e))
    : [];
  const digits = phoneKnown ? digitsOf(inq.phone as string | null) : "";
  const who: Identity = { emails, digits: digits.length >= 8 ? digits : null };
  if (!who.emails.length && !who.digits) return NextResponse.json(empty, { headers: NO_STORE });

  const scope = scopeForRequest(request, access.staff);

  try {
    const repairsRaw = await lookup(who, "customer_email", "customer_phone", (col, pattern) =>
      applyStoreScope(
        sb
          .from("repair_tickets")
          .select("id, ticket_number, device_model, issue_description, status, store_id, customer_email, customer_phone, created_at")
          .ilike(col, pattern)
          .order("created_at", { ascending: false })
          .limit(FETCH),
        scope,
      ),
    );

    // Ordrer: kunde (på mail) -> orders.customer_id.
    const customerIds: string[] = [];
    for (const email of who.emails) {
      const res = await sb.from("customers").select("id, email").ilike("email", escapeLike(email)).limit(5);
      if (res.error) throw res.error;
      for (const c of (res.data ?? []) as Row[]) {
        if (String(c.email ?? "").trim().toLowerCase() === email && !customerIds.includes(String(c.id))) customerIds.push(String(c.id));
      }
    }
    let ordersRaw: Row[] = [];
    if (customerIds.length) {
      const index = await loadLocationIndex();
      const res = await applyLocationScope(
        sb
          .from("orders")
          .select("id, order_number, status, total, created_at, customer_id")
          .in("customer_id", customerIds)
          .order("created_at", { ascending: false })
          .limit(5),
        scope,
        index,
      );
      if (res.error) throw res.error;
      ordersRaw = ((res.data ?? []) as Row[]).filter((o) => customerIds.includes(String(o.customer_id)));
    }

    const inquiryCols = "id, subject, status, channel, source, email, phone, created_at, store_id";
    const buybackRaw = (
      await lookup(who, "email", "phone", (col, pattern) =>
        applyStoreScope(
          sb
            .from("contact_inquiries")
            .select(inquiryCols)
            .eq("source", "saelg-enhed")
            .ilike(col, pattern)
            .order("created_at", { ascending: false })
            .limit(FETCH),
          scope,
        ),
      )
    ).slice(0, 3);
    const offerByInquiry = new Map<string, Row>();
    if (buybackRaw.length) {
      const res = await sb
        .from("trade_in_offers")
        .select("id, inquiry_id, status, offer_amount, created_at")
        .in("inquiry_id", buybackRaw.map((b) => String(b.id)))
        .order("created_at", { ascending: false });
      if (res.error) throw res.error;
      for (const o of (res.data ?? []) as Row[]) if (!offerByInquiry.has(String(o.inquiry_id))) offerByInquiry.set(String(o.inquiry_id), o);
    }

    const previousRaw = (
      await lookup(who, "email", "phone", (col, pattern) =>
        applyStoreScope(
          sb
            .from("contact_inquiries")
            .select(inquiryCols)
            .neq("id", id)
            .ilike(col, pattern)
            .order("created_at", { ascending: false })
            .limit(FETCH),
          scope,
        ),
      )
    ).slice(0, 5);

    return NextResponse.json(
      {
        known: true,
        ...base,
        repairs: repairsRaw.slice(0, 5).map((r) => ({
          id: r.id,
          ticketNumber: r.ticket_number ?? null,
          device: r.device_model ?? null,
          issue: r.issue_description ?? null,
          status: r.status,
          createdAt: r.created_at,
          href: `/admin/reparationer/${r.id}`,
        })),
        orders: ordersRaw.slice(0, 5).map((o) => ({
          id: o.id,
          orderNumber: o.order_number,
          status: o.status,
          total: o.total,
          createdAt: o.created_at,
          href: `/admin/platform/orders/${o.id}`,
        })),
        buyback: buybackRaw.map((b) => {
          const offer = offerByInquiry.get(String(b.id));
          return {
            id: b.id,
            subject: b.subject ?? null,
            status: b.status,
            offerStatus: offer ? offer.status : null,
            offerAmount: offer ? offer.offer_amount : null,
            createdAt: b.created_at,
            href: `/admin/opkoeb/${b.id}`,
          };
        }),
        previous: previousRaw.map((p) => ({
          id: p.id,
          subject: p.subject ?? null,
          status: p.status,
          channel: p.channel,
          createdAt: p.created_at,
          href: `/admin/henvendelser?id=${p.id}`,
        })),
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error("[admin/inbox] customer lookup failed:", id, err instanceof Error ? err.message : "ukendt fejl");
    return NextResponse.json({ error: "Kunne ikke hente kundens historik" }, { status: 500 });
  }
}

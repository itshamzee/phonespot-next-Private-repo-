import { THREE_FOR_TWO_LABEL } from "@/lib/lagersalg/three-for-two";
import type { CustomerInfo } from "@/lib/checkout/order";
import type { CreateCheckoutSessionParams } from "@/lib/stripe/checkout-session";
import {
  frisbii,
  FrisbiiError,
  type FrisbiiChargeSessionRequest,
  type FrisbiiOrderLine,
} from "./client";
import { frisbiiPaymentMethods, frisbiiSettleMode } from "../provider";

export interface FrisbiiCheckoutResult {
  sessionId: string;
  url: string;
  /** Charge-handle hos Frisbii. Gemmes i orders.stripe_payment_id. */
  handle: string;
}

/** Samme levetid som Stripe-sessionen (30 min) — reservationerne følger den. */
const SESSION_TTL = "PT30M";

// Brugte enheder sælges oftest under brugtmomsordningen, og en brugtmomsfaktura
// må ikke vise moms. Frisbiis momsfelt er kun informativt — bogføringens moms
// kommer fra ordren (orders.brugtmoms_total), ikke fra Frisbii.
const VAT_DEVICE = 0;
const VAT_STANDARD = 0.25;

/**
 * Handle skal være unikt pr. konto, [a-zA-Z0-9_.-@], og helst max 11 tegn
 * (Dankort). Første forsøg bruger ordrenummeret direkte (S-1234); en ny
 * session på samme ordre (gendannet kurv) får et kort suffiks, fordi et
 * handle, der er annulleret eller fejlet hos Frisbii, ikke kan genbruges.
 */
export function frisbiiHandle(orderNumber: string, attempt?: string): string {
  const base = orderNumber.replace(/[^a-zA-Z0-9_.\-@]/g, "");
  return attempt ? `${base}-${attempt}` : base;
}

export function retryAttemptSuffix(now = Date.now()): string {
  return now.toString(36).slice(-4);
}

function splitName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return { first_name: parts[0] ?? "", last_name: "" };
  return { first_name: parts.slice(0, -1).join(" "), last_name: parts[parts.length - 1] };
}

function truncate(text: string, max = 200): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Ordrelinjer, der summerer præcis til `total`. Rabatter lægges på som én negativ linje. */
export function buildFrisbiiOrderLines(params: Pick<
  CreateCheckoutSessionParams,
  "items" | "shippingCost" | "discount" | "discountAmount" | "bundleDiscountAmount"
>): FrisbiiOrderLine[] {
  const lines: FrisbiiOrderLine[] = [];

  for (const vi of params.items) {
    if (!vi.available) continue;
    const item = vi.item;
    if (item.type === "device") {
      lines.push({
        ordertext: truncate(`${item.title} — Grade ${item.grade} (${item.storage}, ${item.color})`),
        amount: vi.serverPrice,
        quantity: 1,
        vat: VAT_DEVICE,
      });
      for (const u of item.upgrades ?? []) {
        lines.push({ ordertext: truncate(`${item.title}: ${u.label}`), amount: u.price, quantity: 1, vat: VAT_STANDARD });
      }
    } else {
      lines.push({ ordertext: truncate(item.title), amount: vi.serverPrice, quantity: item.quantity, vat: VAT_STANDARD });
    }
  }

  if (params.shippingCost > 0) {
    lines.push({ ordertext: "Fragt", amount: params.shippingCost, quantity: 1, vat: VAT_STANDARD });
  }

  const codeAmount =
    params.discount && params.discount.type !== "free_shipping" ? params.discountAmount : 0;
  const discountTotal = codeAmount + params.bundleDiscountAmount;
  if (discountTotal > 0) {
    const label = [
      codeAmount > 0 && params.discount ? `Rabatkode: ${params.discount.code}` : null,
      params.bundleDiscountAmount > 0 ? THREE_FOR_TWO_LABEL : null,
    ].filter(Boolean).join(" + ");
    lines.push({ ordertext: label || "Rabat", amount: -discountTotal, quantity: 1, vat: VAT_STANDARD });
  }

  return lines;
}

export function sumOrderLines(lines: FrisbiiOrderLine[]): number {
  return lines.reduce((n, l) => n + l.amount * (l.quantity ?? 1), 0);
}

function customerFields(customer: CustomerInfo) {
  const name = splitName(customer.name);
  const phone = customer.phone?.trim() || undefined;
  const addr = customer.address;
  const hasAddress = !!addr?.line1?.trim();
  const address = hasAddress
    ? {
        ...name,
        address: addr.line1,
        address2: addr.line2 || undefined,
        city: addr.city,
        postal_code: addr.postal_code,
        country: addr.country || "DK",
        email: customer.email,
        phone,
      }
    : undefined;
  return {
    phone,
    address,
    customer: {
      generate_handle: true,
      email: customer.email,
      ...name,
      phone,
      ...(hasAddress
        ? { address: addr.line1, address2: addr.line2 || undefined, city: addr.city, postal_code: addr.postal_code, country: addr.country || "DK" }
        : {}),
    },
  };
}

export interface FrisbiiSessionInput {
  handle: string;
  orderId: string;
  orderNumber: string;
  customer: CustomerInfo;
  total: number;
  lines: FrisbiiOrderLine[];
  /** Ingen adresse at sende videre ved afhentning i butik. */
  shippingAddress: boolean;
  recovery?: boolean;
}

/**
 * Opretter en Frisbii charge-session. Linjerne bruges kun, hvis de summerer
 * præcis til totalen; ellers — eller hvis Frisbii afviser linjerne (f.eks. en
 * negativ rabatlinje) — sendes ét samlet beløb, så kunden aldrig blokeres.
 */
export async function createFrisbiiSession(input: FrisbiiSessionInput): Promise<FrisbiiCheckoutResult> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://phonespot.dk";
  const { phone, address, customer } = customerFields(input.customer);

  const linesMatch = input.lines.length > 0 && sumOrderLines(input.lines) === input.total;
  if (!linesMatch) {
    console.warn("[frisbii] ordrelinjer summerer ikke til totalen — sender samlet beløb", input.orderNumber);
  }

  const build = (withLines: boolean): FrisbiiChargeSessionRequest => ({
    order: {
      handle: input.handle,
      key: `session-${input.handle}${withLines ? "" : "-amount"}`,
      currency: "DKK",
      ...(withLines
        ? { order_lines: input.lines.map((l) => ({ ...l, amount_incl_vat: true })) }
        : { amount: input.total, ordertext: `PhoneSpot ordre ${input.orderNumber}` }),
      customer,
      metadata: {
        order_id: input.orderId,
        order_number: input.orderNumber,
        ...(input.recovery ? { recovery: "true" } : {}),
      },
      ...(address ? { billing_address: address, ...(input.shippingAddress ? { shipping_address: address } : {}) } : {}),
    },
    settle: frisbiiSettleMode() === "instant",
    ...(frisbiiPaymentMethods() ? { payment_methods: frisbiiPaymentMethods() } : {}),
    ...(process.env.FRISBII_CHECKOUT_CONFIGURATION
      ? { configuration: process.env.FRISBII_CHECKOUT_CONFIGURATION }
      : {}),
    locale: "da_DK",
    ttl: SESSION_TTL,
    ...(phone ? { phone } : {}),
    // Frisbii tilføjer selv ?id=<session>&invoice=<handle> til begge URL'er.
    accept_url: `${baseUrl}/ordre/bekraeftelse?provider=frisbii`,
    cancel_url: `${baseUrl}/kasse?cancelled=true`,
    text_on_statement: "PhoneSpot",
  });

  let session;
  try {
    session = await frisbii.createChargeSession(build(linesMatch));
  } catch (err) {
    if (!linesMatch || !(err instanceof FrisbiiError) || err.status !== 400) throw err;
    console.warn("[frisbii] session med ordrelinjer afvist — prøver med samlet beløb:", err.message);
    session = await frisbii.createChargeSession(build(false));
  }

  if (!session?.id || !session?.url) throw new Error("Frisbii charge session has no id/url");
  return { sessionId: session.id, url: session.url, handle: input.handle };
}

/** Webshoppens almindelige checkout (samme input som Stripe-varianten). */
export function createFrisbiiCheckoutSession(
  params: CreateCheckoutSessionParams & { shippingAddress: boolean },
): Promise<FrisbiiCheckoutResult> {
  return createFrisbiiSession({
    handle: frisbiiHandle(params.orderNumber),
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    customer: params.customer,
    total: params.total,
    lines: buildFrisbiiOrderLines(params),
    shippingAddress: params.shippingAddress,
  });
}

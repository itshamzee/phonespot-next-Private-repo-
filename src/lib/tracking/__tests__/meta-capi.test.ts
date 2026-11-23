// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPurchaseEvent,
  clientIpFromHeaders,
  metaCheckoutMetadata,
  metaContextFromMetadata,
  normalizeEmail,
  normalizePhone,
  sendPurchaseToMeta,
  type PurchaseInput,
} from "../meta-capi";
import { purchaseEventId } from "../purchase-event-id";

const hash = (v: string) => createHash("sha256").update(v).digest("hex");

const base: PurchaseInput = {
  orderId: "11111111-2222-3333-4444-555555555555",
  orderNumber: "S-1318",
  totalOere: 367_600,
  contentIds: ["tmpl-1", "sku-1"],
  numItems: 2,
  email: "  Kunde@Example.DK ",
  phone: "+45 12 34 56 78",
  customerId: "cust-1",
  context: { consent: true, fbp: "fb.1.1700000000.123", fbc: "fb.1.1700000000.abc", clientIp: "203.0.113.7", userAgent: "Mozilla/5.0" },
  eventSourceUrl: "https://phonespot.dk/ordre/bekraeftelse",
  eventTime: 1_762_700_000,
};

describe("normalisering", () => {
  it("e-mail trimmes og gøres lowercase", () => {
    expect(normalizeEmail("  Kunde@Example.DK ")).toBe("kunde@example.dk");
    expect(normalizeEmail("ikke-en-mail")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });

  it("telefon bliver kun cifre med landekode 45", () => {
    expect(normalizePhone("+45 12 34 56 78")).toBe("4512345678");
    expect(normalizePhone("0045 12345678")).toBe("4512345678");
    expect(normalizePhone("12 34 56 78")).toBe("4512345678");
    expect(normalizePhone("+46 70 123 45 67")).toBe("46701234567");
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});

describe("buildPurchaseEvent", () => {
  it("bruger samme event_id som browser-pixlen", () => {
    const e = buildPurchaseEvent(base);
    expect(e.event_id).toBe(`purchase_${base.orderId}`);
    expect(e.event_id).toBe(purchaseEventId(base.orderId));
    expect(e.event_name).toBe("Purchase");
    expect(e.action_source).toBe("website");
    expect(e.event_time).toBe(1_762_700_000);
    expect(e.event_source_url).toBe("https://phonespot.dk/ordre/bekraeftelse");
  });

  it("værdi i DKK (ikke øre) og valuta DKK", () => {
    const e = buildPurchaseEvent(base);
    expect(e.custom_data.value).toBe(3676);
    expect(e.custom_data.currency).toBe("DKK");
    expect(e.custom_data.content_ids).toEqual(["tmpl-1", "sku-1"]);
    expect(e.custom_data.num_items).toBe(2);
    expect(e.custom_data.order_id).toBe("S-1318");
    expect(buildPurchaseEvent({ ...base, totalOere: 99_950 }).custom_data.value).toBe(999.5);
  });

  it("hasher e-mail, telefon, external_id og land med sha256 efter normalisering", () => {
    const u = buildPurchaseEvent(base).user_data;
    expect(u.em).toEqual([hash("kunde@example.dk")]);
    expect(u.ph).toEqual([hash("4512345678")]);
    expect(u.external_id).toEqual([hash("cust-1")]);
    expect(u.country).toEqual([hash("dk")]);
    expect(JSON.stringify(u)).not.toContain("example.dk");
    expect(JSON.stringify(u)).not.toContain("12345678\"");
  });

  it("fbp/fbc/IP/user agent sendes uhashede", () => {
    const u = buildPurchaseEvent(base).user_data;
    expect(u.fbp).toBe("fb.1.1700000000.123");
    expect(u.fbc).toBe("fb.1.1700000000.abc");
    expect(u.client_ip_address).toBe("203.0.113.7");
    expect(u.client_user_agent).toBe("Mozilla/5.0");
  });

  it("udelader felter der mangler", () => {
    const u = buildPurchaseEvent({ ...base, email: null, phone: "", customerId: null, context: { consent: true } }).user_data;
    expect(u.em).toBeUndefined();
    expect(u.ph).toBeUndefined();
    expect(u.external_id).toBeUndefined();
    expect(u.fbp).toBeUndefined();
    expect(u.client_user_agent).toBeUndefined();
  });
});

describe("Stripe-metadata", () => {
  it("tom uden samtykke", () => {
    expect(metaCheckoutMetadata({ consent: false, fbp: "x", userAgent: "y" })).toEqual({});
  });

  it("rundtur gennem metadata, klippet til 500 tegn", () => {
    const md = metaCheckoutMetadata({ consent: true, fbp: "fb.1.2.3", fbc: null, clientIp: "203.0.113.7", userAgent: "u".repeat(800) });
    expect(md.meta_consent).toBe("1");
    expect(md.meta_fbc).toBeUndefined();
    expect(md.meta_ua).toHaveLength(500);
    const ctx = metaContextFromMetadata({ ...md, order_id: "o" });
    expect(ctx).toMatchObject({ consent: true, fbp: "fb.1.2.3", fbc: null, clientIp: "203.0.113.7" });
    expect(metaContextFromMetadata(null).consent).toBe(false);
  });

  it("første IP fra x-forwarded-for", () => {
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIpFromHeaders(new Headers())).toBeNull();
  });
});

describe("sendPurchaseToMeta", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "test-token");
    vi.stubEnv("META_PIXEL_ID", "1019833093049140");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("poster til pixelens /events med event i data", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ events_received: 1 }), { status: 200 }));
    const r = await sendPurchaseToMeta(base);
    expect(r).toEqual({ status: "sent", eventsReceived: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/^https:\/\/graph\.facebook\.com\/v\d+\.0\/1019833093049140\/events\?access_token=test-token$/);
    const body = JSON.parse(init.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].event_id).toBe(`purchase_${base.orderId}`);
  });

  it("sender ikke uden samtykke", async () => {
    const r = await sendPurchaseToMeta({ ...base, context: { consent: false } });
    expect(r.status).toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sender ikke uden token", async () => {
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "");
    const r = await sendPurchaseToMeta(base);
    expect(r.status).toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("kaster aldrig — netværksfejl og HTTP-fejl bliver til status failed", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(sendPurchaseToMeta(base)).resolves.toEqual({ status: "failed", error: "offline" });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Invalid token" } }), { status: 400 }));
    await expect(sendPurchaseToMeta(base)).resolves.toMatchObject({ status: "failed" });
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fiksReply, loadProductsForToken, replyHash } from "@/lib/fiks/chat";
import { OFF_TOPIC_SAFE_TEXT, SAFE_PRICE_TEXT } from "@/lib/fiks/config";
import type { FindDevicesDeps, TemplateRow } from "@/lib/fiks/devices";
import { fakeAnthropic, fakeSupabase, tool } from "./fakes";

const TOKEN = "11111111-2222-4333-8444-555555555555";
const now = () => new Date("2026-11-19T10:30:00Z");

function tpl(id: string, name: string, min: number): TemplateRow {
  return {
    id,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    display_name: name,
    brand: "Apple",
    model: name,
    category: "iphone",
    images: [`https://x.supabase.co/${id}.webp`],
    min_price: min,
    device_count: 1,
    locations: [],
  };
}

const deps: FindDevicesDeps = {
  loadTemplates: async (category) => (!category || category === "iphone" ? [tpl("a", "iPhone 13", 349900), tpl("b", "iPhone 12", 249900)] : []),
  loadDevices: async () => [
    { template_id: "a", grade: "B", selling_price: 349900, storage: "128GB", location: { name: "Vejle", type: "store" } },
    { template_id: "b", grade: "C", selling_price: 249900, storage: "64GB", location: null },
  ],
};

function seed(metadata: Record<string, unknown> = {}) {
  return {
    contact_inquiries: [
      { id: "inq-1", channel: "chat", source: "fiks-chat", external_thread_id: TOKEN, status: "besvaret", metadata, created_at: "2026-11-19T10:00:00Z" },
    ],
  };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("fiksReply: product cards", () => {
  it("attaches the last find_devices result, stores it in metadata and keeps what was there", async () => {
    const { client, db } = fakeSupabase(seed({ fiks_ip: "ip-a" }));
    const { anthropic } = fakeAnthropic(async (p) => {
      await tool(p, "find_devices").run({ query: "iPhone 12" });
      await tool(p, "find_devices").run({ query: "iPhone" });
      return "iPhone 12 er den billigste fra 2.499 kr. Kortene herunder viser pris og stand.";
    });
    const out = await fiksReply({ supabase: client, sessionToken: TOKEN, message: "Hvad har I af iPhones?", anthropic, now, findDevicesDeps: deps });

    expect(out.products?.map((p) => p.name)).toEqual(["iPhone 12", "iPhone 13"]);
    const md = db.tables.contact_inquiries[0].metadata as Record<string, unknown>;
    expect(md.fiks_ip).toBe("ip-a");
    expect(md.fiks_products).toEqual({ items: out.products, at: now().toISOString(), reply_hash: replyHash(out.reply) });
  });

  it("attaches nothing when the last call found nothing", async () => {
    const { client, db } = fakeSupabase(seed());
    const { anthropic } = fakeAnthropic(async (p) => {
      await tool(p, "find_devices").run({ query: "iPhone 12" });
      await tool(p, "find_devices").run({ category: "ipad" });
      return "Vi har ingen iPads på lager lige nu.";
    });
    const out = await fiksReply({ supabase: client, sessionToken: TOKEN, message: "iPad?", anthropic, now, findDevicesDeps: deps });
    expect(out.products).toBeUndefined();
    expect((db.tables.contact_inquiries[0].metadata as Record<string, unknown>).fiks_products).toBeUndefined();
  });

  it("drops the cards when the reply fails the amount filter", async () => {
    const { client, db } = fakeSupabase(seed());
    const { anthropic } = fakeAnthropic(async (p) => {
      await tool(p, "find_devices").run({ query: "iPhone 12" });
      return "iPhone 12 koster kun 1.999 kr.";
    });
    const out = await fiksReply({ supabase: client, sessionToken: TOKEN, message: "billig iPhone", anthropic, now, findDevicesDeps: deps });
    expect(out.reply).toBe(SAFE_PRICE_TEXT);
    expect(out.products).toBeUndefined();
    expect((db.tables.contact_inquiries[0].metadata as Record<string, unknown>).fiks_products).toBeUndefined();
  });

  it("drops the cards when the reply has a forbidden word", async () => {
    const { client } = fakeSupabase(seed());
    const { anthropic } = fakeAnthropic(async (p) => {
      await tool(p, "find_devices").run({ query: "iPhone 12" });
      return "Den kommer fra vores dropship-lager.";
    });
    const out = await fiksReply({ supabase: client, sessionToken: TOKEN, message: "hvor kommer den fra", anthropic, now, findDevicesDeps: deps });
    expect(out.reply).toBe(OFF_TOPIC_SAFE_TEXT);
    expect(out.products).toBeUndefined();
  });

  it("returns no cards when storing them fails", async () => {
    const { client, db } = fakeSupabase(seed());
    const { anthropic } = fakeAnthropic(async (p) => {
      await tool(p, "find_devices").run({ query: "iPhone 12" });
      // The session update is done; the metadata write after the model call fails.
      db.failWrites.add("contact_inquiries");
      return "iPhone 12 fra 2.499 kr. er på lager lige nu.";
    });
    const out = await fiksReply({ supabase: client, sessionToken: TOKEN, message: "iPhone 12?", anthropic, now, findDevicesDeps: deps });
    expect(out.reply).toContain("2.499 kr.");
    expect(out.products).toBeUndefined();
  });

  it("tells the model plainly when the stock lookup fails, and attaches nothing", async () => {
    const { client } = fakeSupabase(seed());
    let seen = "";
    const { anthropic } = fakeAnthropic(async (p) => {
      seen = String(await tool(p, "find_devices").run({ query: "iPhone 12" }));
      return "Jeg kan ikke se lageret lige nu.";
    });
    const broken: FindDevicesDeps = { ...deps, loadDevices: async () => Promise.reject(new Error("db down")) };
    const out = await fiksReply({ supabase: client, sessionToken: TOKEN, message: "iPhone 12?", anthropic, now, findDevicesDeps: broken });
    expect(seen).toContain("fejlede teknisk");
    expect(out.products).toBeUndefined();
  });
});

describe("loadProductsForToken", () => {
  const items = [{ name: "iPhone 12", url: "https://phonespot.dk/refurbished/iphone-12", image: null, priceFrom: 2499 }];

  it("returns the cards only for the reply that produced them", async () => {
    const { client } = fakeSupabase(seed({ fiks_products: { items, at: "x", reply_hash: replyHash("Her er iPhone 12.") } }));
    expect(await loadProductsForToken(client, TOKEN, "Her er iPhone 12.")).toEqual(items);
    expect(await loadProductsForToken(client, TOKEN, "Vi har åbent til 18.")).toBeNull();
    expect(await loadProductsForToken(client, TOKEN, null)).toBeNull();
    expect(await loadProductsForToken(client, "not-a-token", "Her er iPhone 12.")).toBeNull();
  });

  it("drops stored items with an unsafe link", async () => {
    const bad = [{ ...items[0], url: "https://evil.example/x" }];
    const { client } = fakeSupabase(seed({ fiks_products: { items: bad, at: "x", reply_hash: replyHash("a") } }));
    expect(await loadProductsForToken(client, TOKEN, "a")).toBeNull();
  });
});

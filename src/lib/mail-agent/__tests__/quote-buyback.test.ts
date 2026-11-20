import { afterEach, describe, expect, it, vi } from "vitest";
import { estimateGuidePrice } from "@/lib/buyback/guide-price-server";
import { quoteBuybackImpl } from "@/lib/mail-agent/quote-buyback";
import type { ToolContext } from "@/lib/mail-agent/tools";

const ctx = (): ToolContext => ({
  supabase: {} as never,
  verified: { emails: [] },
  log: [],
  outputs: [],
  scopeMismatch: { value: false },
});

const input = {
  model: "iPhone 13",
  storage: "128GB",
  screen: "Perfekt" as const,
  back: "Små ridser" as const,
  battery: "God (80%+)" as const,
  charging_broken: false,
  other_faults: false,
  cloud_locked: "Nej" as const,
};

const settings = { publicPriceEnabled: false } as never;
const loadSettings = vi.fn(async () => settings);
const LINK = "https://phonespot.dk/saelg-din-enhed";

afterEach(() => vi.restoreAllMocks());

describe("quoteBuybackImpl", () => {
  it("quotes an indicative price without leaking the margin", async () => {
    const estimate = vi.fn(async () => ({ status: "priced" as const, amountOre: 250000, marginOre: 123456, baseOre: 999000, factor: 0.7 }));
    const out = await quoteBuybackImpl(ctx(), input, { estimate: estimate as never, loadSettings: loadSettings as never });
    expect(out).toContain("2.500 kr.");
    expect(out).toContain("vejledende");
    expect(out).toContain(LINK);
    expect(out).not.toContain("123456");
    expect(out).not.toContain("1.234");
    expect(out).not.toContain("9.990");
    expect(out).not.toMatch(/margin|foxway|dropship/i);
  });

  it("gives no number and points to the sell form when not priced", async () => {
    const estimate = vi.fn(async () => ({ status: "none" as const, reason: "Model uden for iPhone 12-17" }));
    const out = await quoteBuybackImpl(ctx(), input, { estimate: estimate as never, loadSettings: loadSettings as never });
    expect(out).not.toMatch(/kr\.|\d{3}/);
    expect(out).toContain("24 timer");
    expect(out).toContain(LINK);
    expect(out).not.toContain("iPhone 12-17");
  });

  it("does not echo internal reasons", async () => {
    for (const reason of ["For få salgspriser på modellen", "Ingen reservedelspris for screen", "Under mindste fortjeneste"]) {
      const estimate = vi.fn(async () => ({ status: "none" as const, reason }));
      const out = await quoteBuybackImpl(ctx(), input, { estimate: estimate as never, loadSettings: loadSettings as never });
      expect(out).not.toContain(reason);
      expect(out).toContain(LINK);
    }
  });

  it("says we do not buy iCloud-locked devices", async () => {
    const estimate = vi.fn(async () => ({ status: "none" as const, reason: "iCloud-låst" }));
    const out = await quoteBuybackImpl(ctx(), { ...input, cloud_locked: "Ja" }, { estimate: estimate as never, loadSettings: loadSettings as never });
    expect(out).toContain("Vi køber ikke iCloud-låste enheder.");
    expect(out).not.toMatch(/kr\.|\d{3}/);
    expect(estimate).not.toHaveBeenCalled();
  });

  it("asks about iCloud and does not call the engine when the answer is Ved ikke", async () => {
    const estimate = vi.fn();
    const out = await quoteBuybackImpl(ctx(), { ...input, cloud_locked: "Ved ikke" }, { estimate: estimate as never, loadSettings: loadSettings as never });
    expect(out).toBe(
      "Spørg kunden, om Find min iPhone er slået fra og enheden er logget ud af iCloud. Oplys først en pris, når svaret er nej til iCloud-lås.",
    );
    expect(estimate).not.toHaveBeenCalled();
  });

  it("never says binding offer", async () => {
    const estimate = vi.fn(async () => ({ status: "priced" as const, amountOre: 250000, marginOre: 1, baseOre: 1, factor: 0.7 }));
    const out = await quoteBuybackImpl(ctx(), input, { estimate: estimate as never, loadSettings: loadSettings as never });
    expect(out).not.toContain("bindende");
    expect(out).toContain("tilbud inden for 24 timer");
  });

  it("trims model and storage", async () => {
    const estimate = vi.fn(async () => ({ status: "none" as const, reason: "x" }));
    await quoteBuybackImpl(ctx(), { ...input, model: " iPhone 13 ", storage: " 128GB " }, { estimate: estimate as never, loadSettings: loadSettings as never });
    expect((estimate.mock.calls[0] as unknown as [unknown, { model: string; storage: string }])[1]).toMatchObject({ model: "iPhone 13", storage: "128GB" });
  });

  it("asks for storage when the engine says it is missing", async () => {
    const estimate = vi.fn(async () => ({ status: "none" as const, reason: "Lagerplads mangler" }));
    const out = await quoteBuybackImpl(ctx(), input, { estimate: estimate as never, loadSettings: loadSettings as never });
    expect(out).toBe("Spørg kunden om lagerpladsen (fx 128 GB), og prøv igen. Oplys ingen pris, før lagerpladsen er kendt.");
  });

  it("calls the engine with the form's vocabulary and ignoreSwitch", async () => {
    const estimate = vi.fn(async () => ({ status: "none" as const, reason: "x" }));
    const c = ctx();
    await quoteBuybackImpl(c, { ...input, charging_broken: true }, { estimate: estimate as never, loadSettings: loadSettings as never });
    const [client, device, condition, s, options] = estimate.mock.calls[0] as unknown as unknown[];
    expect(client).toBe(c.supabase);
    expect(device).toMatchObject({ deviceType: "Telefon", brand: "Apple", model: "iPhone 13", storage: "128GB", useCustom: false });
    expect(condition).toEqual({
      screen: "Perfekt",
      back: "Små ridser",
      battery: "God (80%+)",
      allWorking: "Nej",
      brokenParts: ["Opladning"],
      cloudLocked: "Nej",
    });
    expect(s).toBe(settings);
    expect(options).toEqual({ ignoreSwitch: true });
  });

  it("maps other faults to an unpriceable part and all-working to Ja", async () => {
    const estimate = vi.fn(async () => ({ status: "none" as const, reason: "x" }));
    await quoteBuybackImpl(ctx(), { ...input, other_faults: true }, { estimate: estimate as never, loadSettings: loadSettings as never });
    expect((estimate.mock.calls[0] as unknown as [unknown, unknown, { allWorking: string; brokenParts: string[] }])[2]).toMatchObject({ allWorking: "Nej", brokenParts: ["Andet"] });
    estimate.mockClear();
    await quoteBuybackImpl(ctx(), input, { estimate: estimate as never, loadSettings: loadSettings as never });
    expect((estimate.mock.calls[0] as unknown as [unknown, unknown, { allWorking: string; brokenParts: string[] }])[2]).toMatchObject({ allWorking: "Ja", brokenParts: [] });
  });

  it("fails safe when the estimate throws", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const estimate = vi.fn(async () => {
      throw new Error("db down");
    });
    const out = await quoteBuybackImpl(ctx(), input, { estimate: estimate as never, loadSettings: loadSettings as never });
    expect(out).toBe("Prisopslaget fejlede teknisk. Oplys ingen pris, og lad en medarbejder tage over.");
    expect(err).toHaveBeenCalled();
  });

  it("fails safe when settings cannot be loaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const estimate = vi.fn();
    const out = await quoteBuybackImpl(ctx(), input, {
      estimate: estimate as never,
      loadSettings: (async () => {
        throw new Error("x");
      }) as never,
    });
    expect(out).toBe("Prisopslaget fejlede teknisk. Oplys ingen pris, og lad en medarbejder tage over.");
    expect(estimate).not.toHaveBeenCalled();
  });
});

describe("quoteBuybackImpl against the real engine", () => {
  const listings = Array.from({ length: 5 }, () => ({ model: "iphone 13", catalogModel: "iPhone 13", storageGb: 128, priceOre: 600000 }));
  const part = (category: string) => ({ category, quality: "Service Pack", price_dkk: 30000, in_stock: true, suitable_for: "iPhone 13", title: "x" });
  const catalog = [part("Display"), part("Battery"), part("Back Cover"), part("Charging Connector")];
  const fakeClient = (() => {
    const api: Record<string, unknown> = {
      select: () => api,
      ilike: () => api,
      in: () => api,
      eq: () => api,
      limit: () => api,
      then: (resolve: (v: unknown) => void) => resolve({ data: catalog, error: null }),
    };
    return { from: () => api } as never;
  })();
  const realSettings = async () => ({ publicPriceEnabled: false, guidePriceFactor: 0.7 }) as never;
  const run = (over: Record<string, unknown> = {}) =>
    quoteBuybackImpl({ ...ctx(), supabase: fakeClient }, { ...input, back: "Perfekt", ...over } as never, {
      estimate: estimateGuidePrice,
      loadSettings: realSettings,
      listings,
    });
  const amount = (out: string) => {
    const m = out.match(/([\d.]+) kr\./);
    return m ? Number(m[1].replace(/\./g, "")) : null;
  };

  it("prices a good phone even with the public switch off", async () => {
    const out = await run();
    expect(amount(out)).toBeGreaterThan(0);
    expect(out).toContain("vejledende");
  });

  it("other_faults gives no number", async () => {
    expect(amount(await run({ other_faults: true }))).toBeNull();
  });

  it("a screen that does not work gives no number", async () => {
    expect(amount(await run({ screen: "Virker ikke" }))).toBeNull();
  });

  it("a cracked screen is priced lower than a perfect one", async () => {
    const good = amount(await run());
    const cracked = amount(await run({ screen: "Revnet" }));
    expect(good).not.toBeNull();
    expect(cracked).not.toBeNull();
    expect(cracked!).toBeLessThan(good!);
  });

  it("a weaker battery is priced lower than a good one", async () => {
    const good = amount(await run());
    for (const battery of ["Okay (60-80%)", "Dårligt (<60%)", "Ved ikke"]) {
      const weak = amount(await run({ battery }));
      expect(weak, battery).not.toBeNull();
      expect(weak!, battery).toBeLessThan(good!);
    }
  });

  it("a charging fault is priced lower than none", async () => {
    const good = amount(await run());
    expect(amount(await run({ charging_broken: true }))!).toBeLessThan(good!);
  });

  it("models outside iPhone 12-17 give no number", async () => {
    expect(amount(await run({ model: "iPhone 11" }))).toBeNull();
    expect(amount(await run({ model: "Samsung Galaxy S23" }))).toBeNull();
  });

  it("storage without a unit gives no number and asks for storage", async () => {
    const out = await run({ storage: "128" });
    expect(amount(out)).toBeNull();
    expect(out).toContain("Spørg kunden om lagerpladsen");
  });
});

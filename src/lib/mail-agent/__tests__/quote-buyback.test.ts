import { afterEach, describe, expect, it, vi } from "vitest";
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
    expect(out).not.toMatch(/\d/);
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

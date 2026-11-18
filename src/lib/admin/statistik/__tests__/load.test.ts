import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "@/test/fake-supabase";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(() => ({})),
  loadLocationIndex: vi.fn(async () => ({ idBySlug: {}, slugById: {} })),
  loadOrders: vi.fn(async () => []),
  loadOrdersWithMeta: vi.fn(async () => ({ orders: [], prepaidWithoutAmount: 0 })),
}));

vi.mock("@/lib/supabase/client", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@/lib/auth/store-scope-server", () => ({
  loadLocationIndex: mocks.loadLocationIndex,
  applyLocationScope: (q: unknown) => q,
  applyStoreScope: (q: unknown) => q,
}));
vi.mock("@/lib/admin/overview/load", () => ({
  CLOSED_REPAIR_STATUSES: ["afhentet", "reklamation_loest"],
  SALE_STATUSES: ["confirmed", "shipped", "picked_up", "delivered"],
  fetchAll: vi.fn(async () => []),
  loadOrders: mocks.loadOrders,
  loadOrdersWithMeta: mocks.loadOrdersWithMeta,
}));
const ga4 = vi.hoisted(() => ({
  configured: false,
  loadFunnel: vi.fn(async (): Promise<{ visits: number; addToCart: number } | null> => null),
}));
vi.mock("../ga4", () => ({ ga4Configured: () => ga4.configured, loadFunnel: ga4.loadFunnel }));

import type { StatViewer } from "../access";
import { loadNowBlock, loadStatistik, resetNowBlockCache } from "../load";
import { statRange } from "../range";

const NOW = new Date("2026-11-18T12:00:00Z");
const FAIL_CLOSED: StatViewer[] = [
  { isOwner: false, scope: "alle", canExport: false },
  { isOwner: false, scope: "ingen", canExport: false },
  { isOwner: true, scope: "ingen", canExport: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  resetNowBlockCache();
  ga4.configured = false;
  ga4.loadFunnel.mockImplementation(async () => null);
});

describe("GA4 funnel timeout", () => {
  const owner: StatViewer = { isOwner: true, scope: "alle", canExport: true };

  afterEach(() => vi.useRealTimers());

  it("a GA4 call that hangs is cut off after 3 seconds and only the funnel is unavailable", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.createServerClient.mockReturnValue(createFakeDb({}).client as never);
    ga4.configured = true;
    ga4.loadFunnel.mockImplementation(() => new Promise(() => {}));

    let done = false;
    const pending = loadStatistik(owner, statRange("30d", NOW), NOW).then((p) => {
      done = true;
      return p;
    });
    await vi.advanceTimersByTimeAsync(2_999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const p = await pending;
    expect(p.unavailable).toEqual(["funnel"]);
    expect(p.webshop.visits).toBeNull();
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("GA4"));
    logged.mockRestore();
  });

  it("a GA4 answer within 3 seconds is used", async () => {
    mocks.createServerClient.mockReturnValue(createFakeDb({}).client as never);
    ga4.configured = true;
    ga4.loadFunnel.mockImplementation(async () => ({ visits: 500, addToCart: 40 }));
    const p = await loadStatistik(owner, statRange("30d", NOW), NOW);
    expect(p.unavailable).toEqual([]);
    expect(p.webshop.visits).toBe(500);
  });
});

describe("fail-closed loading", () => {
  for (const viewer of FAIL_CLOSED) {
    it(`loadStatistik for ${viewer.isOwner ? "owner" : "staff"} with scope ${viewer.scope} makes no queries`, async () => {
      const p = await loadStatistik(viewer, statRange("30d", NOW), NOW);
      expect(mocks.createServerClient).not.toHaveBeenCalled();
      expect(mocks.loadLocationIndex).not.toHaveBeenCalled();
      expect(mocks.loadOrders).not.toHaveBeenCalled();
      expect(mocks.loadOrdersWithMeta).not.toHaveBeenCalled();
      expect(p.viewer.scope).toBe("ingen");
      expect(p.total.revenue).toBe(0);
      expect(p.byStore).toEqual([]);
      expect(p.payments).toEqual([]);
      expect(p.top).toEqual([]);
      expect(p.stores).toEqual(viewer.isOwner ? [{ slug: "alle", label: "Alle" }] : []);
      expect(p.staff ?? []).toEqual([]);
      expect(p.unavailable).toEqual([]);
    });

    it(`loadNowBlock for ${viewer.isOwner ? "owner" : "staff"} with scope ${viewer.scope} makes no queries`, async () => {
      const n = await loadNowBlock(viewer, NOW);
      expect(mocks.createServerClient).not.toHaveBeenCalled();
      expect(mocks.loadOrders).not.toHaveBeenCalled();
      expect(n.today.revenue).toBe(0);
      expect(n.today.count).toBe(0);
      expect(n.rows.every((r) => r.money.revenue === 0)).toBe(true);
    });
  }
});

describe("loadNowBlock cache", () => {
  const viewer: StatViewer = { isOwner: false, scope: "vejle", canExport: false };
  const at = (ms: number) => new Date(NOW.getTime() + ms);

  it("serves calls within 45 seconds from the cache and reloads after", async () => {
    const first = await loadNowBlock(viewer, at(0));
    const second = await loadNowBlock(viewer, at(30_000));
    expect(mocks.loadOrders).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.updatedAt).toBe(at(0).toISOString());

    const third = await loadNowBlock(viewer, at(46_000));
    expect(mocks.loadOrders).toHaveBeenCalledTimes(2);
    expect(third.updatedAt).toBe(at(46_000).toISOString());
  });

  it("keeps owner and staff, and different stores, apart", async () => {
    await loadNowBlock(viewer, NOW);
    await loadNowBlock({ isOwner: true, scope: "vejle", canExport: true }, NOW);
    await loadNowBlock({ isOwner: false, scope: "slagelse", canExport: false }, NOW);
    expect(mocks.loadOrders).toHaveBeenCalledTimes(3);
  });
});

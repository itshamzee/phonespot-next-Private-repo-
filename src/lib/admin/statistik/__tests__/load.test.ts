import { beforeEach, describe, expect, it, vi } from "vitest";

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
vi.mock("../ga4", () => ({ ga4Configured: () => false, loadFunnel: vi.fn(async () => null) }));

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

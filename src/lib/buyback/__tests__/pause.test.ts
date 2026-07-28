import { describe, it, expect } from "vitest";
import { catalogStaleReason, catalogLastSyncedAt } from "../pause";
import { makeFakeClient } from "./fake-supabase";

const now = new Date("2026-08-01T09:00:00Z");

describe("catalogStaleReason", () => {
  it("is fine when the catalog synced today", () => {
    expect(catalogStaleReason("2026-08-01T06:00:00Z", now)).toBeNull();
  });

  it("is fine at just under three days", () => {
    expect(catalogStaleReason("2026-07-29T10:00:00Z", now)).toBeNull();
  });

  it("flags a catalog older than three days", () => {
    const reason = catalogStaleReason("2026-07-27T06:00:00Z", now);
    expect(reason).toMatch(/katalog/i);
    expect(reason).toMatch(/dage/);
  });

  it("reports the real age in days", () => {
    // The real state of the live catalog when this was written: last synced
    // 2026-03-17, four months before anyone noticed.
    expect(catalogStaleReason("2026-03-17T20:05:17Z", now)).toContain("136 dage");
  });

  it("flags a catalog that never synced", () => {
    expect(catalogStaleReason(null, now)).toMatch(/aldrig/i);
  });

  it("flags an unparseable date rather than trusting it", () => {
    expect(catalogStaleReason("ikke en dato", now)).toMatch(/gyldig/i);
  });
});

describe("catalogLastSyncedAt", () => {
  it("returns the freshest sync timestamp", async () => {
    const { client } = makeFakeClient({
      foneday_catalog: [{ last_synced_at: "2026-07-27T06:00:00Z" }],
    });
    expect(await catalogLastSyncedAt(client)).toBe("2026-07-27T06:00:00Z");
  });

  it("returns null for an empty catalog", async () => {
    const { client } = makeFakeClient({ foneday_catalog: [] });
    expect(await catalogLastSyncedAt(client)).toBeNull();
  });
});

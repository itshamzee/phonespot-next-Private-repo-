// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({}) }));

import { fetchAll } from "../load";

const PAGE = 1000;
const MAX_PAGES = 40;

/** Én side med `n` rækker. */
const page = (n: number) => ({ data: Array.from({ length: n }, (_, i) => i), error: null });

describe("fetchAll", () => {
  it("collects pages until a short page", async () => {
    const calls: [number, number][] = [];
    const rows = await fetchAll<number>(async (from, to) => {
      calls.push([from, to]);
      return page(calls.length < 3 ? PAGE : 10);
    });
    expect(rows).toHaveLength(2 * PAGE + 10);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("throws instead of silently stopping when the last allowed page is full", async () => {
    let calls = 0;
    await expect(
      fetchAll<number>(async () => {
        calls += 1;
        return page(PAGE);
      }),
    ).rejects.toThrow(/for mange rækker/);
    expect(calls).toBe(MAX_PAGES);
  });

  it("does not throw when exactly MAX_PAGES pages are needed and the last is short", async () => {
    let calls = 0;
    const rows = await fetchAll<number>(async () => {
      calls += 1;
      return page(calls < MAX_PAGES ? PAGE : 1);
    });
    expect(rows).toHaveLength((MAX_PAGES - 1) * PAGE + 1);
  });

  it("throws the query error", async () => {
    await expect(fetchAll<number>(async () => ({ data: null, error: { message: "nope" } }))).rejects.toThrow("nope");
  });
});

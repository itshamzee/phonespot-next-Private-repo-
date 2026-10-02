// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data: unknown; error: { message: string } | null };

const state = vi.hoisted(() => ({
  staffRow: null as Record<string, unknown> | null,
  /** results for successive locations queries (with slug first, then without) */
  locationResults: [] as { data: unknown; error: { message: string } | null }[],
  locationSelects: [] as string[],
}));

vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table === "staff") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async (): Promise<Result> => ({ data: state.staffRow, error: null }),
        };
        return chain;
      }
      if (table === "locations") {
        const chain = {
          select: (cols: string) => {
            state.locationSelects.push(cols);
            return chain;
          },
          eq: () => chain,
          maybeSingle: async (): Promise<Result> => state.locationResults.shift() ?? { data: null, error: null },
        };
        return chain;
      }
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createRequestAuthClient: () => null }));

import { lookupStaffByAuthId } from "../require-staff";

beforeEach(() => {
  state.staffRow = null;
  state.locationResults = [];
  state.locationSelects = [];
});

describe("lookupStaffByAuthId", () => {
  it("returns null when there is no active staff row", async () => {
    expect(await lookupStaffByAuthId("a")).toBeNull();
  });

  it("returns id, role, location_id and location_slug", async () => {
    state.staffRow = { id: "s1", role: "employee", name: "Mette", email: "m@phonespot.dk", location_id: "L1" };
    state.locationResults = [{ data: { id: "L1", name: "Vejle", type: "store", slug: "vejle" }, error: null }];
    expect(await lookupStaffByAuthId("a")).toEqual({
      id: "s1",
      role: "employee",
      name: "Mette",
      email: "m@phonespot.dk",
      location_id: "L1",
      location_slug: "vejle",
    });
  });

  it("the owner needs no location", async () => {
    state.staffRow = { id: "o", role: "owner", name: "Ejer", email: "o@phonespot.dk", location_id: null };
    const staff = await lookupStaffByAuthId("a");
    expect(staff).toMatchObject({ role: "owner", location_id: null, location_slug: null });
    expect(state.locationSelects).toHaveLength(0);
  });

  it("still works before the slug migration has run (derives the slug from type/name)", async () => {
    state.staffRow = { id: "s1", role: "employee", name: "Mette", email: "m@phonespot.dk", location_id: "L2" };
    state.locationResults = [
      { data: null, error: { message: "column locations.slug does not exist" } },
      { data: { id: "L2", name: "Slagelse", type: "store" }, error: null },
    ];
    expect((await lookupStaffByAuthId("a"))?.location_slug).toBe("slagelse");
    expect(state.locationSelects).toEqual(["id, name, type, slug", "id, name, type"]);
  });

  it("an unknown location leaves the slug null (scope fails closed)", async () => {
    state.staffRow = { id: "s1", role: "employee", name: "M", email: "m@phonespot.dk", location_id: "L9" };
    state.locationResults = [{ data: { id: "L9", name: "Lager", type: "warehouse", slug: null }, error: null }];
    expect((await lookupStaffByAuthId("a"))?.location_slug).toBeNull();
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const result = vi.hoisted(() => ({ value: { data: null, error: null } as { data: unknown; error: unknown }, throws: false }));

vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (result.throws) throw new Error("boom");
            return result.value;
          },
        }),
      }),
    }),
  }),
}));

import { legalEntityForLocation, legalEntityForStoreSlug } from "../legal-entity-server";

const FIXON = { name: "Fixon ApS", cvr: "46079019" };
const PHONEGO = { name: "PhoneGo ApS", cvr: "38688766" };

describe("legal-entity-server", () => {
  beforeEach(() => {
    result.value = { data: null, error: null };
    result.throws = false;
  });

  it("falls back to Fixon for a null location id", async () => {
    expect(await legalEntityForLocation(null)).toEqual(FIXON);
  });

  it("resolves PhoneGo for the Slagelse location", async () => {
    result.value = { data: { legal_entities: PHONEGO }, error: null };
    expect(await legalEntityForLocation("5eda7697-6410-4a00-9c1c-9a800c4067c9")).toEqual(PHONEGO);
  });

  it("accepts the relation as an array", async () => {
    result.value = { data: { legal_entities: [PHONEGO] }, error: null };
    expect(await legalEntityForStoreSlug("slagelse")).toEqual(PHONEGO);
  });

  it("falls back to Fixon for a null slug and an unknown location", async () => {
    expect(await legalEntityForStoreSlug(null)).toEqual(FIXON);
    expect(await legalEntityForLocation("unknown")).toEqual(FIXON);
  });

  it("falls back to Fixon when the lookup errors or throws", async () => {
    result.value = { data: null, error: { message: "x" } };
    expect(await legalEntityForLocation("abc")).toEqual(FIXON);
    result.throws = true;
    expect(await legalEntityForLocation("abc")).toEqual(FIXON);
  });
});

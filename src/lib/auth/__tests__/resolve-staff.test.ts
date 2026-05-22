import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveStaff, OWNER_EMAIL_WHITELIST } from "../resolve-staff";

type FakeRow = { id: string; auth_id: string; role: string };

function makeSupabase(opts: {
  staffByAuthId?: Record<string, FakeRow>;
  insertResult?: FakeRow | null;
  insertError?: { message: string } | null;
}) {
  const insertCalls: unknown[] = [];
  const client = {
    from(_table: string) {
      return {
        select(_cols: string) {
          const eq = (_col: string, val: string) => ({
            maybeSingle: async () => ({
              data: opts.staffByAuthId?.[val] ?? null,
              error: null,
            }),
          });
          return { eq };
        },
        insert(row: unknown) {
          insertCalls.push(row);
          return {
            select(_c: string) {
              return {
                single: async () => ({
                  data: opts.insertResult ?? null,
                  error: opts.insertError ?? null,
                }),
              };
            },
          };
        },
      };
    },
  };
  return { client, insertCalls };
}

describe("resolveStaff", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns existing staff row when present", async () => {
    const { client } = makeSupabase({
      staffByAuthId: { "auth-1": { id: "s-1", auth_id: "auth-1", role: "manager" } },
    });
    const result = await resolveStaff(
      client as never,
      { id: "auth-1", email: "anyone@example.com" },
    );
    expect(result).toEqual({ id: "s-1", auth_id: "auth-1", role: "manager" });
  });

  it("auto-provisions an owner for an @phonespot.dk email", async () => {
    const { client, insertCalls } = makeSupabase({
      staffByAuthId: {},
      insertResult: { id: "s-new", auth_id: "auth-2", role: "owner" },
    });
    const result = await resolveStaff(
      client as never,
      { id: "auth-2", email: "newowner@phonespot.dk" },
    );
    expect(result?.role).toBe("owner");
    expect(insertCalls).toHaveLength(1);
  });

  it("auto-provisions an owner for a whitelisted email", async () => {
    const whitelisted = OWNER_EMAIL_WHITELIST[0];
    if (!whitelisted) throw new Error("OWNER_EMAIL_WHITELIST is empty — test is invalid");
    const { client } = makeSupabase({
      staffByAuthId: {},
      insertResult: { id: "s-3", auth_id: "auth-3", role: "owner" },
    });
    const result = await resolveStaff(
      client as never,
      { id: "auth-3", email: whitelisted },
    );
    expect(result?.role).toBe("owner");
  });

  it("returns null for non-owner email when no staff row exists", async () => {
    const { client, insertCalls } = makeSupabase({ staffByAuthId: {} });
    const result = await resolveStaff(
      client as never,
      { id: "auth-4", email: "random@gmail.com" },
    );
    expect(result).toBeNull();
    expect(insertCalls).toHaveLength(0);
  });

  it("returns null when user has no email", async () => {
    const { client } = makeSupabase({ staffByAuthId: {} });
    const result = await resolveStaff(client as never, { id: "auth-5", email: null });
    expect(result).toBeNull();
  });
});

// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({}) }));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => null) }));

import { createFakeDb } from "@/test/fake-supabase";
import { buildLocationIndex } from "../store-scope";
import {
  applyLocationScope,
  applyStoreScope,
  scopeForRequest,
  storeCookieFromHeader,
} from "../store-scope-server";
import type { StaffIdentity } from "../require-staff";

const staff = (role: string, slug: StaffIdentity["location_slug"]): StaffIdentity => ({
  id: "s1",
  role,
  name: "T",
  email: "t@phonespot.dk",
  location_id: slug ? `loc-${slug}` : null,
  location_slug: slug,
});

const req = (url: string, cookie?: string) =>
  new Request(url, { headers: cookie ? { cookie } : {} });

describe("storeCookieFromHeader", () => {
  it("reads ps_store among other cookies", () => {
    expect(storeCookieFromHeader("a=1; ps_store=vejle; b=2")).toBe("vejle");
    expect(storeCookieFromHeader("ps_store=slagelse")).toBe("slagelse");
    expect(storeCookieFromHeader("sb-token=x")).toBeNull();
    expect(storeCookieFromHeader(null)).toBeNull();
  });
});

describe("scopeForRequest", () => {
  it("owner follows the cookie", () => {
    expect(scopeForRequest(req("http://x/api", "ps_store=slagelse"), staff("owner", null))).toBe("slagelse");
    expect(scopeForRequest(req("http://x/api"), staff("owner", null))).toBe("alle");
  });

  it("owner: ?store= beats the cookie", () => {
    expect(scopeForRequest(req("http://x/api?store=webshop", "ps_store=vejle"), staff("owner", null))).toBe("webshop");
  });

  it("staff cannot widen or move their scope with cookie or query", () => {
    const s = staff("employee", "vejle");
    expect(scopeForRequest(req("http://x/api", "ps_store=slagelse"), s)).toBe("vejle");
    expect(scopeForRequest(req("http://x/api?store=alle", "ps_store=alle"), s)).toBe("vejle");
  });
});

describe("applyStoreScope", () => {
  const rows = [
    { id: "a", store_id: "vejle" },
    { id: "b", store_id: "slagelse" },
    { id: "c", store_id: null },
  ];
  const ids = async (scope: Parameters<typeof applyStoreScope>[1]) => {
    const { client } = createFakeDb({ t: rows.map((r) => ({ ...r })) });
    const { data } = (await applyStoreScope(client.from("t").select("*") as never, scope)) as unknown as {
      data: { id: string }[];
    };
    return data.map((r) => r.id);
  };

  it("alle: everything", async () => expect(await ids("alle")).toEqual(["a", "b", "c"]));
  it("physical store: only that store", async () => {
    expect(await ids("vejle")).toEqual(["a"]);
    expect(await ids("slagelse")).toEqual(["b"]);
  });
  it("webshop: rows without a physical store", async () => expect(await ids("webshop")).toEqual(["c"]));
  it("ingen: nothing", async () => expect(await ids("ingen")).toEqual([]));
});

describe("applyLocationScope", () => {
  const index = buildLocationIndex([
    { id: "LV", name: "Vejle", type: "store", slug: "vejle" },
    { id: "LS", name: "Slagelse", type: "store", slug: "slagelse" },
    { id: "LW", name: "Webshop", type: "online", slug: "webshop" },
  ]);
  const orders = [
    { id: "pos-vejle", location_id: "LV" },
    { id: "pos-slagelse", location_id: "LS" },
    { id: "web-null", location_id: null },
    { id: "web-loc", location_id: "LW" },
  ];

  it("physical scope sees only orders of that location, never webshop orders", async () => {
    const { client, db } = createFakeDb({ orders: orders.map((o) => ({ ...o })) });
    const { data } = (await applyLocationScope(client.from("orders").select("*") as never, "vejle", index)) as unknown as {
      data: { id: string }[];
    };
    expect(data.map((o) => o.id)).toEqual(["pos-vejle"]);
    expect(db.log).toContain("orders.location_id=eq:LV");
  });

  it("webshop scope asks for null location or the online location", () => {
    const { client, db } = createFakeDb({ orders: [] });
    applyLocationScope(client.from("orders").select("*") as never, "webshop", index);
    expect(db.log).toContain("orders.or=location_id.is.null,location_id.eq.LW");
  });

  it("a physical slug without a location row matches nothing", async () => {
    const { client } = createFakeDb({ orders: orders.map((o) => ({ ...o })) });
    const { data } = (await applyLocationScope(client.from("orders").select("*") as never, "vejle", buildLocationIndex([]))) as unknown as {
      data: unknown[];
    };
    expect(data).toEqual([]);
  });
});

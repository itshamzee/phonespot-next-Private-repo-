// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  staff: null as null | Record<string, unknown>,
  client: null as unknown,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));

import { createFakeDb } from "@/test/fake-supabase";
import { resetLocationCache } from "@/lib/auth/store-scope-server";
import { loadOverview } from "@/lib/admin/overview/load";
import { GET } from "../route";

const OWNER = { id: "o", role: "owner", name: "Ejer", email: "o@phonespot.dk", location_id: null, location_slug: null };
const VEJLE = { id: "v", role: "employee", name: "Mikkel", email: "v@phonespot.dk", location_id: "L-v", location_slug: "vejle" };
const NOSTORE = { id: "n", role: "employee", name: "Ny", email: "n@phonespot.dk", location_id: null, location_slug: null };

const NOW = new Date("2026-10-04T10:00:00Z"); // søndag, 12:00 dansk tid
const TODAY = "2026-10-04T08:00:00Z";

function order(id: string, location_id: string | null, total: number, type = "pos") {
  return {
    id,
    type,
    status: "confirmed",
    confirmed_at: TODAY,
    location_id,
    total,
    vat_total: 0,
    brugtmoms_total: 0,
    order_items: [{ item_type: "sku_product", quantity: 1, total_price: total, purchase_price: 0, vat_scheme: "regular" }],
  };
}

function seed() {
  return createFakeDb({
    locations: [
      { id: "L-v", name: "Vejle", type: "store", slug: "vejle" },
      { id: "L-s", name: "Slagelse", type: "store", slug: "slagelse" },
      { id: "L-w", name: "Webshop", type: "online", slug: "webshop" },
    ],
    orders: [
      order("o-v", "L-v", 100_000),
      order("o-s", "L-s", 200_000),
      order("o-w", null, 50_000, "online"),
    ],
    registers: [
      { id: "R-v", name: "Kasse 1", location_id: "L-v", active: true },
      { id: "R-s", name: "Kasse 1", location_id: "L-s", active: true },
    ],
    cash_sessions: [
      { id: "S-v", register_id: "R-v", opened_at: "2026-10-04T08:02:00Z", opened_by: "v", closed_at: null, closed_by: null, difference: null, locked: false },
      { id: "S-s1", register_id: "R-s", opened_at: "2026-10-02T07:00:00Z", opened_by: null, closed_at: "2026-10-02T16:00:00Z", closed_by: null, difference: -2_000, locked: true },
    ],
    staff: [{ id: "v", name: "Mikkel" }],
    cash_session_adjustments: [],
    repair_tickets: [
      { id: "t-v", store_id: "vejle", status: "faerdig", ticket_number: "1189", device_model: "OnePlus Nord 3", service_type: "Skærm", services: null, updated_at: "2026-10-01T10:00:00Z" },
      { id: "t-s", store_id: "slagelse", status: "faerdig", ticket_number: "2001", device_model: "iPhone 12", service_type: "Batteri", services: null, updated_at: "2026-09-20T10:00:00Z" },
      { id: "t-v2", store_id: "vejle", status: "i_gang", ticket_number: "1190", device_model: "iPad", service_type: "Skærm", services: null, updated_at: "2026-10-03T10:00:00Z" },
      { id: "t-done", store_id: "vejle", status: "afhentet", ticket_number: "1100", device_model: "x", service_type: "y", services: null, updated_at: "2026-09-01T10:00:00Z" },
    ],
    repair_status_log: [],
    stock_transfers: [],
    sku_stock: [],
  });
}

let db: ReturnType<typeof seed>["db"];

const call = (qs = "", cookie?: string) =>
  GET(new Request(`http://x/api/admin/overview${qs}`, { headers: cookie ? { cookie } : {} }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  resetLocationCache();
  const s = seed();
  db = s.db;
  state.client = s.client;
  state.staff = null;
});
afterEach(() => vi.useRealTimers());

describe("GET /api/admin/overview", () => {
  it("kræver personale", async () => {
    expect((await call()).status).toBe(401);
  });

  it("medarbejdere får altid kun deres egen butik, uanset ?store= og cookie", async () => {
    state.staff = VEJLE;
    const res = await call("?store=slagelse", "ps_store=slagelse");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.kind).toBe("store");
    expect(body.scope).toBe("vejle");
    expect(body.kpis.revenue).toBe(100_000);
    expect(body.kpis.salesCount).toBe(1);
    expect(db.log).toContain("orders.location_id=eq:L-v");
    expect(db.log.join("\n")).not.toContain("L-s");
    expect(db.log).toContain("repair_tickets.store_id=eq:vejle");
    expect(db.log).not.toContain("repair_tickets.store_id=eq:slagelse");
  });

  it("sager klar til afhentning i andre butikker slipper ikke igennem", async () => {
    state.staff = VEJLE;
    const body = await (await call()).json();
    expect(body.ready.total).toBe(1);
    expect(body.ready.items[0]).toMatchObject({ id: "t-v", label: "#1189", overdue: true });
  });

  it("kassen viser åben kasse med hvem og hvornår", async () => {
    state.staff = VEJLE;
    const body = await (await call()).json();
    expect(body.cash).toEqual({ state: "open", detail: "Kasse 1 · åbnet 10.02 af Mikkel" });
  });

  it("medarbejder uden butik ser intet og rører ikke ordrer eller sager", async () => {
    state.staff = NOSTORE;
    const body = await (await call()).json();
    expect(body.scope).toBe("ingen");
    expect(body.kpis.revenue).toBe(0);
    expect(body.ready.items).toEqual([]);
    expect(db.log.filter((l) => l.startsWith("orders.") || l.startsWith("repair_tickets."))).toEqual([]);
  });

  it("medarbejdere kan ikke bede om kvartal eller år, men ejeren kan", async () => {
    state.staff = VEJLE;
    expect((await (await call("?periode=kvartal")).json()).period).toBe("dag");
    state.staff = OWNER;
    expect((await (await call("?periode=kvartal")).json()).period).toBe("kvartal");
  });

  it("ejeren uden valgt butik får Alle butikker med tal pr. butik og i alt", async () => {
    state.staff = OWNER;
    const body = await (await call("?periode=uge")).json();
    expect(body.kind).toBe("alle");
    const by = Object.fromEntries(body.stores.map((s: { slug: string }) => [s.slug, s]));
    expect(by.vejle.revenue).toBe(100_000);
    expect(by.slagelse.revenue).toBe(200_000);
    expect(by.webshop.revenue).toBe(50_000);
    expect(body.total.revenue).toBe(350_000);
    expect(body.total.salesCount).toBe(3);
    expect(by.vejle.openCases).toBe(2);
    expect(by.vejle.cash).toBe("Åben");
    expect(by.slagelse.cash).toBe("Lukket");
    expect(by.webshop.cash).toBe("–");
    expect(body.total.openCases).toBe(3);
  });

  it("dagsopgørelsen viser seneste afsluttede kasse med difference", async () => {
    state.staff = OWNER;
    const body = await (await call()).json();
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0]).toMatchObject({ store: "Slagelse", register: "Kasse 1", registerId: "R-s", difference: -2_000, locked: true });
  });

  it("ejeren kan vælge en enkelt butik via cookien", async () => {
    state.staff = OWNER;
    const body = await (await call("", "ps_store=slagelse")).json();
    expect(body.kind).toBe("store");
    expect(body.scope).toBe("slagelse");
    expect(body.kpis.revenue).toBe(200_000);
    expect(body.ready.total).toBe(1);
    expect(body.ready.items[0].id).toBe("t-s");
  });

  it("webshop-scope ser kun ordrer uden fysisk butik", async () => {
    state.staff = OWNER;
    const body = await (await call("?store=webshop")).json();
    expect(body.scope).toBe("webshop");
    expect(body.kpis.revenue).toBe(50_000);
  });
});

describe("loadOverview", () => {
  it("fail closed: samlet visning kræver ejer", async () => {
    const data = await loadOverview({ scope: "alle", isOwner: false }, "uge", NOW);
    expect(data.kind).toBe("store");
    if (data.kind === "store") expect(data.scope).toBe("ingen");
    expect(db.log.filter((l) => l.startsWith("orders."))).toEqual([]);
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const state = vi.hoisted(() => ({
  staff: null as null | Record<string, unknown>,
  client: null as unknown,
  adjust: null as unknown as Mock,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/pos/sessions", () => ({ adjustStock: (...args: unknown[]) => state.adjust(...args) }));

import { revalidatePath } from "next/cache";
import { createFakeDb } from "@/test/fake-supabase";
import { resetLocationCache } from "@/lib/auth/store-scope-server";
import { GET as TREE } from "../tree/route";
import { POST as CREATE_MODEL } from "../models/route";
import { PATCH as PATCH_MODEL } from "../models/[id]/route";
import { PATCH as PATCH_SERVICE } from "../services/[id]/route";
import { POST as BULK } from "../services/bulk/route";
import { GET as STOCK_GET, POST as STOCK_POST } from "../parts/[id]/stock/route";

const L = { vejle: "L-v", slagelse: "L-s" };
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const BRAND = uuid(1);
const MODEL = uuid(2);
const S_PRICED = uuid(10);
const S_UNPRICED = uuid(11);
const S_ACTIVE = uuid(12);
const PART = uuid(20);

const EMPLOYEE = { id: "e", role: "employee", name: "E", email: null, location_id: L.vejle, location_slug: "vejle" };
const VEJLE_MGR = { id: "m", role: "manager", name: "M", email: null, location_id: L.vejle, location_slug: "vejle" };
const OWNER = { id: "o", role: "owner", name: "O", email: null, location_id: null, location_slug: null };

let tables: Record<string, Record<string, unknown>[]>;

function setup(extra: Record<string, Record<string, unknown>[]> = {}) {
  resetLocationCache();
  tables = {
    locations: [
      { id: L.vejle, name: "Vejle", type: "store", slug: "vejle" },
      { id: L.slagelse, name: "Slagelse", type: "store", slug: "slagelse" },
    ],
    repair_brands: [{ id: BRAND, slug: "iphone", name: "iPhone", device_type: "smartphone", logo_url: null, sort_order: 0, active: true }],
    repair_models: [
      { id: MODEL, brand_id: BRAND, slug: "iphone-18-pro", name: "iPhone 18 Pro", series: "iPhone 18", image_url: null, sort_order: 0, active: false, repair_brands: { slug: "iphone" } },
      { id: uuid(3), brand_id: BRAND, slug: "iphone-17-pro", name: "iPhone 17 Pro", series: "iPhone 17", image_url: null, sort_order: 0, active: true, repair_brands: { slug: "iphone" } },
    ],
    repair_services: [
      { id: S_PRICED, model_id: MODEL, price_dkk: 1000, active: false },
      { id: S_UNPRICED, model_id: MODEL, price_dkk: 0, active: false },
      { id: S_ACTIVE, model_id: MODEL, price_dkk: 500, active: true },
    ],
    repair_service_parts: [{ repair_service_id: S_PRICED, sku_product_id: PART }],
    sku_products: [{ id: PART, title: "Skærm iPhone 18 Pro", always_in_stock: true, cost_price: 45000 }],
    sku_stock: [],
    ...extra,
  };
  state.client = { ...createFakeDb(tables).client, rpc: vi.fn(async () => ({ data: null, error: null })) };
  state.adjust = vi.fn(async ({ delta }: { delta: number }) => ({ quantity: delta, tracking_started: true }));
  state.staff = null;
  vi.mocked(revalidatePath).mockClear();
}

const req = (method: string, body?: unknown) =>
  new Request("http://x/api", { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const row = (table: string, id: string) => tables[table].find((r) => r.id === id) as Record<string, unknown>;

beforeEach(() => setup());

describe("adgang", () => {
  it("401 uden login", async () => {
    expect((await TREE(req("GET"))).status).toBe(401);
    expect((await PATCH_SERVICE(req("PATCH", { price_dkk: 5 }), params(S_PRICED))).status).toBe(401);
    expect((await BULK(req("POST", { action: "activate_priced", model_id: MODEL }))).status).toBe(401);
  });

  it("403 for medarbejdere på alle skriveruter og træet", async () => {
    state.staff = EMPLOYEE;
    expect((await TREE(req("GET"))).status).toBe(403);
    expect((await CREATE_MODEL(req("POST", { name: "iPhone 19", brand_id: BRAND }))).status).toBe(403);
    expect((await PATCH_MODEL(req("PATCH", { active: false }), params(MODEL))).status).toBe(403);
    expect((await PATCH_SERVICE(req("PATCH", { price_dkk: 5 }), params(S_PRICED))).status).toBe(403);
    expect((await BULK(req("POST", { action: "activate_priced", model_id: MODEL }))).status).toBe(403);
    expect((await STOCK_POST(req("POST", { counts: { vejle: 1 } }), params(PART))).status).toBe(403);
    expect(row("repair_services", S_PRICED).price_dkk).toBe(1000);
  });

  it("manager og ejer må hente træet", async () => {
    state.staff = VEJLE_MGR;
    const res = await TREE(req("GET"));
    expect(res.status).toBe(200);
    state.staff = OWNER;
    expect((await TREE(req("GET"))).status).toBe(200);
  });
});

describe("PATCH service", () => {
  beforeEach(() => {
    state.staff = OWNER;
  });

  it("afviser pris 0, negative og decimaler", async () => {
    for (const price_dkk of [0, -10, 12.5]) {
      const res = await PATCH_SERVICE(req("PATCH", { price_dkk }), params(S_PRICED));
      expect(res.status).toBe(400);
    }
    expect(row("repair_services", S_PRICED).price_dkk).toBe(1000);
  });

  it("afviser ukendte felter", async () => {
    expect((await PATCH_SERVICE(req("PATCH", { model_id: uuid(99) }), params(S_PRICED))).status).toBe(400);
  });

  it("aktiveringsvagt: kan ikke aktivere en reparation uden pris", async () => {
    const res = await PATCH_SERVICE(req("PATCH", { active: true }), params(S_UNPRICED));
    expect(res.status).toBe(422);
    expect(row("repair_services", S_UNPRICED).active).toBe(false);
  });

  it("kan aktivere med ny pris i samme kald, og revaliderer hjemmesidens sider", async () => {
    const res = await PATCH_SERVICE(req("PATCH", { active: true, price_dkk: 799 }), params(S_UNPRICED));
    expect(res.status).toBe(200);
    expect(row("repair_services", S_UNPRICED)).toMatchObject({ active: true, price_dkk: 799 });
    const paths = vi.mocked(revalidatePath).mock.calls.map((c) => c[0]);
    expect(paths).toEqual(["/reparation/iphone/iphone-18-pro", "/reparation/iphone", "/reparation"]);
  });

  it("aktiverer en reparation, der allerede har pris", async () => {
    const res = await PATCH_SERVICE(req("PATCH", { active: true }), params(S_PRICED));
    expect(res.status).toBe(200);
    expect(row("repair_services", S_PRICED).active).toBe(true);
  });

  it("gemmer minutter og garanti (tom garanti bliver null)", async () => {
    const res = await PATCH_SERVICE(req("PATCH", { estimated_minutes: 45, warranty_info: "  " }), params(S_PRICED));
    expect(res.status).toBe(200);
    expect(row("repair_services", S_PRICED)).toMatchObject({ estimated_minutes: 45, warranty_info: null });
  });

  it("404 for ukendt reparation", async () => {
    expect((await PATCH_SERVICE(req("PATCH", { price_dkk: 5 }), params(uuid(77)))).status).toBe(404);
  });
});

describe("bulk", () => {
  beforeEach(() => {
    state.staff = VEJLE_MGR;
  });

  it("prisændring regnes som forhåndsvisningen og gemmes samlet", async () => {
    const res = await BULK(req("POST", { action: "price", model_id: MODEL, ids: [S_PRICED, S_ACTIVE], op: { mode: "percent", amount: 10 } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ updated: 2 });
    expect(row("repair_services", S_PRICED).price_dkk).toBe(1100);
    expect(row("repair_services", S_ACTIVE).price_dkk).toBe(550);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/reparation/iphone/iphone-18-pro");
  });

  it("skriver ingenting, hvis en række ville få en ugyldig pris", async () => {
    const res = await BULK(req("POST", { action: "price", model_id: MODEL, ids: [S_PRICED, S_ACTIVE], op: { mode: "delta", amount: -600 } }));
    expect(res.status).toBe(422);
    expect(row("repair_services", S_PRICED).price_dkk).toBe(1000);
    expect(row("repair_services", S_ACTIVE).price_dkk).toBe(500);
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("afviser reparationer fra en anden model", async () => {
    tables.repair_services.push({ id: uuid(50), model_id: uuid(3), price_dkk: 100, active: true });
    const res = await BULK(req("POST", { action: "price", model_id: MODEL, ids: [uuid(50)], op: { mode: "delta", amount: 10 } }));
    expect(res.status).toBe(400);
    expect(row("repair_services", uuid(50)).price_dkk).toBe(100);
  });

  it("aktivering af valgte kræver pris på alle", async () => {
    const res = await BULK(req("POST", { action: "set_active", model_id: MODEL, ids: [S_PRICED, S_UNPRICED], active: true }));
    expect(res.status).toBe(422);
    expect(row("repair_services", S_PRICED).active).toBe(false);
  });

  it("skjul valgte kræver ingen pris", async () => {
    const res = await BULK(req("POST", { action: "set_active", model_id: MODEL, ids: [S_ACTIVE], active: false }));
    expect(res.status).toBe(200);
    expect(row("repair_services", S_ACTIVE).active).toBe(false);
  });

  it("aktivér alle med pris rører kun inaktive med pris over 0", async () => {
    const res = await BULK(req("POST", { action: "activate_priced", model_id: MODEL }));
    expect(await res.json()).toEqual({ updated: 1 });
    expect(row("repair_services", S_PRICED).active).toBe(true);
    expect(row("repair_services", S_UNPRICED).active).toBe(false);
  });

  it("validerer input", async () => {
    expect((await BULK(req("POST", { action: "price", model_id: MODEL, ids: [], op: { mode: "delta", amount: 5 } }))).status).toBe(400);
    expect((await BULK(req("POST", { action: "price", model_id: MODEL, ids: [S_PRICED], op: { mode: "percent", amount: -100 } }))).status).toBe(400);
    expect((await BULK(req("POST", { action: "nope" }))).status).toBe(400);
  });
});

describe("modeller", () => {
  beforeEach(() => {
    state.staff = OWNER;
  });

  it("opretter en ny model som inaktiv med unik slug", async () => {
    const res = await CREATE_MODEL(req("POST", { name: "iPhone 18 Pro", brand_id: BRAND }));
    // Navnet findes allerede under mærket
    expect(res.status).toBe(409);

    const ok = await CREATE_MODEL(req("POST", { name: "iPhone 18 Pro Max", brand_id: BRAND, series: " iPhone 18 " }));
    expect(ok.status).toBe(201);
    expect(await ok.json()).toMatchObject({ slug: "iphone-18-pro-max", name: "iPhone 18 Pro Max", series: "iPhone 18", active: false });
    const inserted = tables.repair_models.at(-1)!;
    expect(inserted).toMatchObject({ active: false, brand_id: BRAND });
  });

  it("kræver gyldigt mærke og navn", async () => {
    expect((await CREATE_MODEL(req("POST", { name: "x", brand_id: BRAND }))).status).toBe(400);
    expect((await CREATE_MODEL(req("POST", { name: "iPhone 19", brand_id: uuid(404) }))).status).toBe(400);
    expect((await CREATE_MODEL(req("POST", { name: "iPhone 19", brand_id: "ikke-et-id" }))).status).toBe(400);
  });

  it("modellen kan ikke aktiveres uden en aktiv reparation med pris", async () => {
    tables.repair_services = tables.repair_services.filter((s) => s.id !== S_ACTIVE);
    const res = await PATCH_MODEL(req("PATCH", { active: true }), params(MODEL));
    expect(res.status).toBe(422);
    expect(row("repair_models", MODEL).active).toBe(false);
  });

  it("modellen kan aktiveres, når en reparation er live, og hjemmesiden revalideres", async () => {
    const res = await PATCH_MODEL(req("PATCH", { active: true }), params(MODEL));
    expect(res.status).toBe(200);
    expect(row("repair_models", MODEL).active).toBe(true);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/reparation/iphone/iphone-18-pro");
  });

  it("ændrer serie og kan ikke ændre slug", async () => {
    expect((await PATCH_MODEL(req("PATCH", { series: "iPhone 18 Pro" }), params(MODEL))).status).toBe(200);
    expect(row("repair_models", MODEL).series).toBe("iPhone 18 Pro");
    expect((await PATCH_MODEL(req("PATCH", { slug: "andet" }), params(MODEL))).status).toBe(400);
  });
});

describe("lager på reservedel", () => {
  it("manager kan ikke tælle op i den anden butik", async () => {
    state.staff = VEJLE_MGR;
    const res = await STOCK_POST(req("POST", { counts: { slagelse: 3 } }), params(PART));
    expect(res.status).toBe(403);
    expect(state.adjust).not.toHaveBeenCalled();
  });

  it("optælling regnes om til en regulering med noten Optælling", async () => {
    state.staff = OWNER;
    tables.sku_stock.push({ product_id: PART, location_id: L.vejle, quantity: 2, reserved_qty: 0 });
    const res = await STOCK_POST(req("POST", { counts: { vejle: 5, slagelse: 3 } }), params(PART));
    expect(res.status).toBe(200);
    expect(state.adjust).toHaveBeenCalledTimes(2);
    expect(state.adjust).toHaveBeenCalledWith(expect.objectContaining({ productId: PART, locationId: L.vejle, delta: 3, reason: "adjust", note: "Optælling", staffId: "o" }));
    expect(state.adjust).toHaveBeenCalledWith(expect.objectContaining({ locationId: L.slagelse, delta: 3 }));
    expect((await res.json()).tracking_started).toBe(true);
  });

  it("uændret optælling på en lagerstyret del skriver intet", async () => {
    state.staff = OWNER;
    row("sku_products", PART).always_in_stock = false;
    tables.sku_stock.push({ product_id: PART, location_id: L.vejle, quantity: 4, reserved_qty: 0 });
    const res = await STOCK_POST(req("POST", { counts: { vejle: 4 } }), params(PART));
    expect(res.status).toBe(200);
    expect(state.adjust).not.toHaveBeenCalled();
  });

  it("nul i alle butikker kan ikke starte lagerstyring (funktionen kræver en ændring)", async () => {
    state.staff = OWNER;
    const res = await STOCK_POST(req("POST", { counts: { vejle: 0, slagelse: 0 } }), params(PART));
    expect(res.status).toBe(422);
    expect(state.adjust).not.toHaveBeenCalled();
  });

  it("afviser negative og ikke-hele antal, og varer der ikke er reservedele", async () => {
    state.staff = OWNER;
    expect((await STOCK_POST(req("POST", { counts: { vejle: -1 } }), params(PART))).status).toBe(400);
    expect((await STOCK_POST(req("POST", { counts: { vejle: 1.5 } }), params(PART))).status).toBe(400);
    expect((await STOCK_POST(req("POST", { counts: {} }), params(PART))).status).toBe(400);
    expect((await STOCK_POST(req("POST", { counts: { vejle: 1 } }), params(uuid(404)))).status).toBe(404);
  });

  it("GET viser antal pr. butik og hvem der må redigere", async () => {
    state.staff = VEJLE_MGR;
    tables.sku_stock.push({ product_id: PART, location_id: L.slagelse, quantity: 6, reserved_qty: 1 });
    const body = await (await STOCK_GET(req("GET"), params(PART))).json();
    expect(body.tracked).toBe(false);
    expect(body.stores).toEqual([
      { slug: "vejle", name: "Vejle", quantity: 0, reserved: 0, can_edit: true },
      { slug: "slagelse", name: "Slagelse", quantity: 6, reserved: 1, can_edit: false },
    ]);
  });
});

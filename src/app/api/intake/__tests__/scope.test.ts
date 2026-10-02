// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  staff: null as null | Record<string, unknown>,
  client: null as unknown,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));
vi.mock("@/lib/stripe/client", () => ({ stripe: {} }));
vi.mock("@/lib/gateway-api/client", () => ({ sendSms: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn() };
  },
}));

import { createFakeDb } from "@/test/fake-supabase";
import { resetLocationCache } from "@/lib/auth/store-scope-server";
import { POST } from "../route";

const OWNER = { id: "o", role: "owner", name: "Ejer", email: "o@phonespot.dk", location_id: null, location_slug: null };
const VEJLE = { id: "v", role: "employee", name: "Vejle", email: "v@phonespot.dk", location_id: "L-v", location_slug: "vejle" };
const WEBSHOP = { id: "w", role: "employee", name: "Web", email: "w@phonespot.dk", location_id: "L-w", location_slug: "webshop" };

const BODY = {
  customer: { id: "c1", name: "Anna", phone: "12345678", email: "" },
  device: { id: "d1", brand: "Apple", model: "iPhone 12" },
  isNewDevice: false,
  checklist: [],
  intakePhotos: ["intake/1.jpg"],
  selectedServices: [{ id: "s1", name: "Skærm", price_dkk: 500 }],
  customServices: [],
  internalNotes: "",
  sendSms: false,
  sendEmail: false,
};

let db: ReturnType<typeof createFakeDb>["db"];
beforeEach(() => {
  const s = createFakeDb({ repair_tickets: [], repair_status_log: [], customer_devices: [] });
  db = s.db;
  state.client = s.client;
  state.staff = null;
  resetLocationCache();
});

const post = (body: unknown, cookie?: string) =>
  POST(
    new Request("http://x/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/intake store comes from the scope", () => {
  it("401 without staff, nothing written", async () => {
    expect((await post({ ...BODY, store_id: "vejle" })).status).toBe(401);
    expect(db.tables.repair_tickets).toHaveLength(0);
  });

  it("a Vejle employee always intakes in Vejle, even if the client asks for Slagelse", async () => {
    state.staff = VEJLE;
    expect((await post({ ...BODY, store_id: "slagelse" }, "ps_store=slagelse")).status).toBe(201);
    expect(db.tables.repair_tickets[0].store_id).toBe("vejle");
  });

  it("works without any store sent by the client (no picker for staff)", async () => {
    state.staff = VEJLE;
    expect((await post(BODY)).status).toBe(201);
    expect(db.tables.repair_tickets[0].store_id).toBe("vejle");
  });

  it("webshop-only staff cannot create a store intake", async () => {
    state.staff = WEBSHOP;
    expect((await post({ ...BODY, store_id: "vejle" })).status).toBe(400);
    expect(db.tables.repair_tickets).toHaveLength(0);
  });

  it("the owner picks a store, or uses the switcher", async () => {
    state.staff = OWNER;
    expect((await post({ ...BODY, store_id: "slagelse" })).status).toBe(201);
    expect((await post(BODY, "ps_store=vejle")).status).toBe(201);
    expect(db.tables.repair_tickets.map((t) => t.store_id)).toEqual(["slagelse", "vejle"]);
  });

  it("the owner on 'alle' without a choice is asked to pick", async () => {
    state.staff = OWNER;
    expect((await post(BODY)).status).toBe(400);
    expect(db.tables.repair_tickets).toHaveLength(0);
  });
});

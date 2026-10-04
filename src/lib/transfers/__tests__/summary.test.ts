// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));

import { createFakeDb } from "@/test/fake-supabase";
import { resetLocationCache } from "@/lib/auth/store-scope-server";
import { getPendingTransfers } from "../summary";

const L = { vejle: "L-v", slagelse: "L-s", webshop: "L-w" };

function header(id: string, number: number, status: string, from: string, to: string) {
  return { id, number, status, from_location_id: from, to_location_id: to, requested_at: `2026-10-0${number}T09:00:00Z`, sent_at: status === "sent" ? `2026-10-0${number}T10:00:00Z` : null };
}

beforeEach(() => {
  resetLocationCache();
  const fake = createFakeDb({
    locations: [
      { id: L.vejle, name: "Vejle", type: "store", slug: "vejle" },
      { id: L.slagelse, name: "Slagelse", type: "store", slug: "slagelse" },
      { id: L.webshop, name: "Webshop", type: "online", slug: "webshop" },
    ],
    stock_transfers: [
      header("t1", 1, "requested", L.vejle, L.slagelse), // Slagelse asks Vejle
      header("t2", 2, "sent", L.slagelse, L.vejle), // Slagelse -> Vejle on the way
      header("t3", 3, "received", L.webshop, L.vejle), // finished
      header("t4", 4, "sent", L.webshop, L.slagelse), // not touching Vejle
    ],
    stock_transfer_lines: [
      { transfer_id: "t1", description: "USB-C kabel 1 m", qty: 2, sent_qty: 0 },
      { transfer_id: "t2", description: "iPhone 14 Pro 128 GB · Grade A", qty: 1, sent_qty: 1 },
      { transfer_id: "t4", description: "Skærm (OEM)", qty: 1, sent_qty: 1 },
    ],
  });
  state.client = fake.client;
});

describe("getPendingTransfers", () => {
  it("returns incoming and outgoing open transfers for one location", async () => {
    const v = await getPendingTransfers(L.vejle);
    expect(v.incoming.count).toBe(1);
    expect(v.incoming.toReceive).toBe(1);
    expect(v.incoming.items[0]).toMatchObject({ id: "t2", fromName: "Slagelse", toName: "Vejle", status: "sent" });
    expect(v.outgoing.count).toBe(1);
    expect(v.outgoing.toSend).toBe(1);
    expect(v.outgoing.items[0]).toMatchObject({ id: "t1", summary: "2× USB-C kabel 1 m", status: "requested" });
  });

  it("ignores received transfers and other stores' traffic", async () => {
    const s = await getPendingTransfers(L.slagelse);
    expect(s.incoming.items.map((i) => i.id).sort()).toEqual(["t1", "t4"]);
    expect(s.outgoing.items.map((i) => i.id)).toEqual(["t2"]);
    const w = await getPendingTransfers(L.webshop);
    expect(w.incoming.count).toBe(0);
    expect(w.outgoing.count).toBe(1);
  });

  it("'alle' = every sent transfer to receive and every requested transfer to send", async () => {
    const all = await getPendingTransfers("alle");
    expect(all.incoming.items.map((i) => i.id).sort()).toEqual(["t2", "t4"]);
    expect(all.incoming.toReceive).toBe(2);
    expect(all.outgoing.items.map((i) => i.id)).toEqual(["t1"]);
    expect(all.outgoing.toSend).toBe(1);
  });
});

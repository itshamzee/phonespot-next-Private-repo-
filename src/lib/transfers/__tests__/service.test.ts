// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));

import { createFakeDb } from "@/test/fake-supabase";
import { resetLocationCache } from "@/lib/auth/store-scope-server";
import type { StaffIdentity } from "@/lib/auth/require-staff";
import { TransferError } from "../errors";
import { cancelTransfer, listTransfers, receiveTransfer, requestTransfer, sendTransfer } from "../service";

const L = { vejle: "L-v", slagelse: "L-s", webshop: "L-w" };
const OWNER: StaffIdentity = { id: "o", role: "owner", name: "Ejer", email: null, location_id: null, location_slug: null };
const VEJLE: StaffIdentity = { id: "v", role: "employee", name: "Mikkel", email: null, location_id: L.vejle, location_slug: "vejle" };
const SLAGELSE: StaffIdentity = { id: "s", role: "employee", name: "Sara", email: null, location_id: L.slagelse, location_slug: "slagelse" };
const WEB: StaffIdentity = { id: "w", role: "employee", name: "Web", email: null, location_id: L.webshop, location_slug: "webshop" };

const SKU = "11111111-1111-4111-8111-111111111111";

function setup(status: "requested" | "sent" | "received" | "cancelled" = "requested", extra: { receivedQty?: number } = {}) {
  const fake = createFakeDb({
    locations: [
      { id: L.vejle, name: "Vejle", type: "store", slug: "vejle" },
      { id: L.slagelse, name: "Slagelse", type: "store", slug: "slagelse" },
      { id: L.webshop, name: "Webshop", type: "online", slug: "webshop" },
    ],
    // Slagelse (to) asks Vejle (from)
    stock_transfers: [
      {
        id: "T1",
        number: 1,
        status,
        from_location_id: L.vejle,
        to_location_id: L.slagelse,
        note: null,
        requested_by: "s",
        requested_at: "2026-10-04T09:00:00Z",
        sent_by: null,
        sent_at: null,
        received_by: null,
        received_at: null,
        cancelled_at: null,
        closed_short: false,
      },
    ],
    stock_transfer_lines: [
      {
        id: "LN1",
        transfer_id: "T1",
        sku_product_id: SKU,
        device_id: null,
        template_id: null,
        storage: null,
        grade: null,
        description: "USB-C kabel 1 m",
        qty: 2,
        sent_qty: status === "requested" ? 0 : 2,
        received_qty: extra.receivedQty ?? 0,
        returned_qty: 0,
      },
    ],
    sku_products: [{ id: SKU, ean: "5700000000017", product_number: null }],
    devices: [],
    staff: [
      { id: "s", name: "Sara" },
      { id: "v", name: "Mikkel" },
    ],
  });
  const rpc = vi.fn<(...a: unknown[]) => Promise<{ data: unknown; error: unknown }>>(async () => ({
    data: { id: "T1", number: 1, status: "ok" },
    error: null,
  }));
  const client = { ...fake.client, rpc };
  state.client = client;
  return { rpc, db: client as never };
}

beforeEach(() => {
  resetLocationCache();
});

describe("requestTransfer scope", () => {
  const lines = [{ skuProductId: SKU, qty: 2 }];

  it("a Slagelse employee can request from Vejle into Slagelse", async () => {
    const { rpc, db } = setup();
    await requestTransfer(SLAGELSE, { fromSlug: "vejle", toSlug: "slagelse", lines }, db);
    expect(rpc).toHaveBeenCalledWith(
      "transfer_request",
      expect.objectContaining({ p_from: L.vejle, p_to: L.slagelse, p_staff_id: "s" }),
    );
  });

  it("cannot request on behalf of another store", async () => {
    const { rpc, db } = setup();
    await expect(requestTransfer(SLAGELSE, { fromSlug: "slagelse", toSlug: "vejle", lines }, db)).rejects.toMatchObject({ status: 403 });
    await expect(requestTransfer(SLAGELSE, { fromSlug: "vejle", toSlug: "vejle", lines }, db)).rejects.toBeInstanceOf(TransferError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("the owner can request into any store", async () => {
    const { rpc, db } = setup();
    await requestTransfer(OWNER, { fromSlug: "vejle", toSlug: "webshop", lines }, db);
    expect(rpc).toHaveBeenCalledWith("transfer_request", expect.objectContaining({ p_to: L.webshop }));
  });
});

describe("send", () => {
  it("only the sending store may send", async () => {
    const { rpc, db } = setup("requested");
    await expect(sendTransfer(SLAGELSE, "T1", null, db)).rejects.toMatchObject({ status: 403 });
    expect(rpc).not.toHaveBeenCalled();
    await sendTransfer(VEJLE, "T1", null, db);
    expect(rpc).toHaveBeenCalledWith("transfer_send", expect.objectContaining({ p_transfer_id: "T1", p_staff_id: "v" }));
  });

  it("an uninvolved store gets 404, not 403", async () => {
    const { rpc, db } = setup("requested");
    await expect(sendTransfer(WEB, "T1", null, db)).rejects.toMatchObject({ status: 404 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("cannot send something that is already sent or received", async () => {
    for (const status of ["sent", "received", "cancelled"] as const) {
      const { rpc, db } = setup(status);
      await expect(sendTransfer(VEJLE, "T1", null, db)).rejects.toMatchObject({ code: "not_requested", status: 409 });
      expect(rpc).not.toHaveBeenCalled();
    }
  });

  it("passes line overrides as snake_case", async () => {
    const { rpc, db } = setup("requested");
    await sendTransfer(VEJLE, "T1", [{ lineId: "LN1", qty: 1 }], db);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_lines: [{ line_id: "LN1", qty: 1, device_ids: [] }] });
  });
});

describe("receive", () => {
  const scans = [{ lineId: "LN1", qty: 1 }];

  it("cannot receive before it is sent", async () => {
    const { rpc, db } = setup("requested");
    await expect(receiveTransfer(SLAGELSE, "T1", scans, false, db)).rejects.toMatchObject({ code: "not_sent", status: 409 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("only the receiving store may receive (the sender may not receive its own shipment)", async () => {
    const { rpc, db } = setup("sent");
    await expect(receiveTransfer(VEJLE, "T1", scans, false, db)).rejects.toMatchObject({ status: 403 });
    expect(rpc).not.toHaveBeenCalled();
    await receiveTransfer(SLAGELSE, "T1", scans, false, db);
    expect(rpc).toHaveBeenCalledWith(
      "transfer_receive",
      expect.objectContaining({ p_lines: [{ line_id: "LN1", qty: 1 }], p_close_short: false, p_staff_id: "s" }),
    );
  });

  it("cannot receive twice", async () => {
    const { rpc, db } = setup("received");
    await expect(receiveTransfer(SLAGELSE, "T1", scans, false, db)).rejects.toMatchObject({ code: "already_received" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("surfaces database business errors (partial receipt guard) as Danish messages", async () => {
    const { rpc, db } = setup("sent");
    rpc.mockResolvedValueOnce({ data: null, error: { message: "transfer:over_receive:USB-C kabel 1 m" } });
    await expect(receiveTransfer(SLAGELSE, "T1", scans, false, db)).rejects.toMatchObject({ code: "over_receive", status: 409 });
  });
});

describe("cancel", () => {
  it("both sides may cancel a request", async () => {
    for (const who of [VEJLE, SLAGELSE]) {
      const { rpc, db } = setup("requested");
      await cancelTransfer(who, "T1", null, db);
      expect(rpc).toHaveBeenCalledWith("transfer_cancel", expect.objectContaining({ p_transfer_id: "T1" }));
    }
  });

  it("once sent only the sender may cancel", async () => {
    const { rpc, db } = setup("sent");
    await expect(cancelTransfer(SLAGELSE, "T1", null, db)).rejects.toMatchObject({ status: 403 });
    expect(rpc).not.toHaveBeenCalled();
    await cancelTransfer(VEJLE, "T1", null, db);
    expect(rpc).toHaveBeenCalled();
  });

  it("not after a partial receipt: close short instead", async () => {
    const { rpc, db } = setup("sent", { receivedQty: 1 });
    await expect(cancelTransfer(VEJLE, "T1", null, db)).rejects.toMatchObject({ code: "partially_received", status: 409 });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("listTransfers visibility", () => {
  it("employees see only transfers touching their own store", async () => {
    const { db } = setup("sent");
    expect((await listTransfers(VEJLE, "vejle", db)).map((t) => t.id)).toEqual(["T1"]);
    expect((await listTransfers(SLAGELSE, "slagelse", db)).map((t) => t.id)).toEqual(["T1"]);
    expect(await listTransfers(WEB, "webshop", db)).toEqual([]);
  });

  it("an employee cannot widen scope through the owner's store switcher value", async () => {
    const { db } = setup("sent");
    expect(await listTransfers(WEB, "alle", db)).toEqual([]);
  });

  it("the owner sees everything on 'alle' and is narrowed by the switcher", async () => {
    const { db } = setup("sent");
    expect(await listTransfers(OWNER, "alle", db)).toHaveLength(1);
    expect(await listTransfers(OWNER, "webshop", db)).toHaveLength(0);
    expect(await listTransfers(OWNER, "vejle", db)).toHaveLength(1);
  });

  it("hydrates lines with scan codes, names and the viewer's permissions", async () => {
    const { db } = setup("sent");
    const [t] = await listTransfers(SLAGELSE, "slagelse", db);
    expect(t.from.name).toBe("Vejle");
    expect(t.to.name).toBe("Slagelse");
    expect(t.requestedByName).toBe("Sara");
    expect(t.lines[0].codes).toEqual(["5700000000017"]);
    expect(t.can).toEqual({ send: false, receive: true, cancel: false });
  });
});

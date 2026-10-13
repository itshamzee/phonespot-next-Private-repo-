// @vitest-environment node
import { describe, expect, it } from "vitest";
import { addPart, removePart, retryPart } from "../repair-parts";
import { memoryRepo } from "./memory-repo";

const staff = { id: "staff-1", name: "Maria", email: "m@phonespot.dk" };
const T0 = new Date("2026-10-13T10:00:00Z");
let n = 0;
const newId = () => `id-${++n}`;
const tickets = [
  { id: "tv", store_id: "vejle", ticket_number: "PS-2026-0001" },
  { id: "ts", store_id: "slagelse", ticket_number: null },
  { id: "tg", store_id: null, ticket_number: "PS-2026-0003" },
];
const base = { sharedSku: "SCR-IP13-OLED", partName: "Skærm iPhone 13", qty: 1, costPriceOre: 41500, staff, newId, now: T0 };

describe("addPart", () => {
  it("draws from the hub for the Vejle store and records who and where", async () => {
    const repo = memoryRepo(tickets);
    const r = await addPart(repo, { ...base, ticketId: "tv" });
    expect(r.ok && r.value).toMatchObject({
      movement_type: "TAKE", location_code: "vejle-hub", reference: "PS-2026-0001",
      actor_label: "PhoneSpot-admin: Maria", created_by: "staff-1", status: "pending",
      idempotency_key: expect.stringMatching(/^repair:tv:take:id-\d+$/),
    });
  });

  it("uses the Slagelse store location and falls back to the ticket id as reference", async () => {
    const r = await addPart(memoryRepo(tickets), { ...base, ticketId: "ts" });
    expect(r.ok && r.value).toMatchObject({ location_code: "phonespot-slagelse", reference: "ts" });
  });

  it("refuses a Generel ticket until a store is chosen", async () => {
    expect(await addPart(memoryRepo(tickets), { ...base, ticketId: "tg" })).toEqual({ ok: false, status: 409, message: "Vælg butik på sagen, før du registrerer dele" });
  });

  it.each([0, 101, 1.5, Number.NaN])("rejects qty %s", async (qty) => {
    expect(await addPart(memoryRepo(tickets), { ...base, ticketId: "tv", qty })).toMatchObject({ ok: false, status: 400 });
  });

  it("404s an unknown ticket", async () => {
    expect(await addPart(memoryRepo(tickets), { ...base, ticketId: "nope" })).toMatchObject({ ok: false, status: 404 });
  });
});

describe("removePart", () => {
  it("removePart uses the TAKE row's location even after the store changed", async () => {
    const repo = memoryRepo(tickets);
    const added = await addPart(repo, { ...base, ticketId: "tv" });
    if (!added.ok) throw new Error("setup");
    repo.tickets[0].store_id = "slagelse";
    const r = await removePart(repo, { ticketId: "tv", partId: added.value.id, staff, newId, now: T0 });
    expect(r.ok && r.value).toMatchObject({
      movement_type: "RETURN", reverses_id: added.value.id, location_code: "vejle-hub", qty: 1,
      idempotency_key: `repair:tv:return:${added.value.id}`,
    });
    expect(repo.rows.find((x) => x.id === added.value.id)?.voided_at).not.toBeNull();
  });

  it("removing twice creates one RETURN", async () => {
    const repo = memoryRepo(tickets);
    const added = await addPart(repo, { ...base, ticketId: "tv" });
    if (!added.ok) throw new Error("setup");
    const a = await removePart(repo, { ticketId: "tv", partId: added.value.id, staff, newId, now: T0 });
    const b = await removePart(repo, { ticketId: "tv", partId: added.value.id, staff, newId, now: T0 });
    expect(a.ok && b.ok).toBe(true);
    expect(repo.rows.filter((x) => x.movement_type === "RETURN")).toHaveLength(1);
  });

  it("a TAKE that failed is only voided; nothing is returned to stock", async () => {
    const repo = memoryRepo(tickets);
    const added = await addPart(repo, { ...base, ticketId: "tv" });
    if (!added.ok) throw new Error("setup");
    await repo.markFailed(added.value.id, "x", T0);
    const r = await removePart(repo, { ticketId: "tv", partId: added.value.id, staff, newId, now: T0 });
    expect(r.ok && r.value.movement_type).toBe("TAKE");
    expect(repo.rows.filter((x) => x.movement_type === "RETURN")).toHaveLength(0);
  });

  it("404s a part from another ticket, or a RETURN row", async () => {
    const repo = memoryRepo(tickets);
    const added = await addPart(repo, { ...base, ticketId: "tv" });
    if (!added.ok) throw new Error("setup");
    expect(await removePart(repo, { ticketId: "ts", partId: added.value.id, staff })).toMatchObject({ ok: false, status: 404 });
    const ret = await removePart(repo, { ticketId: "tv", partId: added.value.id, staff, newId, now: T0 });
    if (!ret.ok) throw new Error("setup");
    expect(await removePart(repo, { ticketId: "tv", partId: ret.value.id, staff })).toMatchObject({ ok: false, status: 404 });
  });
});

describe("retryPart", () => {
  it("only resets failed rows, with a fresh 24h window", async () => {
    const repo = memoryRepo(tickets);
    const added = await addPart(repo, { ...base, ticketId: "tv" });
    if (!added.ok) throw new Error("setup");
    expect(await retryPart(repo, { ticketId: "tv", partId: added.value.id })).toMatchObject({ ok: false, status: 409 });
    await repo.markFailed(added.value.id, "x", T0);
    const later = new Date("2026-10-15T08:00:00Z");
    const r = await retryPart(repo, { ticketId: "tv", partId: added.value.id, now: later });
    expect(r.ok && r.value).toMatchObject({ status: "pending", pending_since: later.toISOString(), last_error: null });
  });
});

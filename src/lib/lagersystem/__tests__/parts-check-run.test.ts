// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { LagersystemError } from "../client";
import { checkTicketParts, recheckUnknownTickets, shortageKey, type TicketForCheck } from "../parts-check-run";
import { memoryPartsCheckRepo } from "./memory-parts-check-repo";

const T0 = new Date("2026-10-13T12:00:00Z");
const links = [{ service_id: "svc-screen", shared_sku: "SCR-IP13", qty: 1, part_name: "Skærm iPhone 13" }];
const ticket = (id: string, over: Partial<TicketForCheck> = {}): TicketForCheck => ({
  id, store_id: "vejle", status: "modtaget", parts_status: null, parts_shortage: null, parts_notified_key: null,
  ticket_number: `PS-${id}`, device_model: "iPhone 13", customer_name: "Kunde",
  booking_details: { selected_services: [{ id: "svc-screen", name: "Skærmskift", price_dkk: 1499 }] }, services: null,
  paid: false, stripe_session_id: null, created_at: T0.toISOString(), ...over,
});
const client = (qty: number | "down") => ({
  getBalances: vi.fn(async (location: string) => {
    if (qty === "down") throw new LagersystemError(0, "network", "down");
    return { location, as_of: T0.toISOString(), balances: [{ shared_sku: "SCR-IP13", qty, updated_at: "t" }] };
  }),
  getPart: vi.fn(async (sku: string) => ({ shared_sku: sku, name: "Fra katalog", category: null, quality: null, device_models: [], cost_price_ore: null, active: true })),
});
const run = (repo: ReturnType<typeof memoryPartsCheckRepo>, c: ReturnType<typeof client>, notify = vi.fn(async () => {})) =>
  ({ notify, result: checkTicketParts("new", { repo, client: c, notify, now: T0 }) });

describe("checkTicketParts", () => {
  it("is ok when the hub has enough after other open Vejle tickets", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("new"), ticket("old")], links });
    const c = client(2);
    const { notify, result } = run(repo, c);
    expect(await result).toBe("ok");
    expect(c.getBalances).toHaveBeenCalledWith("vejle-hub");
    expect(repo.tickets[0].parts_status).toBe("ok");
    expect(notify).not.toHaveBeenCalled();
  });

  it("flags needs_order when an older open ticket already claims the last unit, and mails once", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("new"), ticket("old")], links });
    const { notify, result } = run(repo, client(1));
    expect(await result).toBe("needs_order");
    expect(repo.tickets[0].parts_shortage).toEqual([{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", needed: 1, available: 0 }]);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ id: "new" }), repo.tickets[0].parts_shortage);

    const again = vi.fn(async () => {});
    await checkTicketParts("new", { repo, client: client(1), notify: again, now: T0 });
    expect(again).not.toHaveBeenCalled();
  });

  it("ignores tickets from another store, closed tickets and abandoned prepaid checkouts", async () => {
    const old = new Date(T0.getTime() - 3 * 3600_000).toISOString();
    const repo = memoryPartsCheckRepo({
      tickets: [
        ticket("new"),
        ticket("slg", { store_id: "slagelse" }),
        ticket("done", { status: "afhentet" }),
        ticket("abandoned", { stripe_session_id: "cs_1", paid: false, created_at: old }),
      ],
      links,
    });
    expect(await run(repo, client(1)).result).toBe("ok");
  });

  it("counts a part already used on another ticket as gone from demand", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("new"), ticket("old")], links, taken: [{ ticket_id: "old", shared_sku: "SCR-IP13", qty: 1 }] });
    expect(await run(repo, client(1)).result).toBe("ok");
  });

  it("marks unknown, without mail and without throwing, when the lagersystem is down", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("new")], links });
    const { notify, result } = run(repo, client("down"));
    expect(await result).toBe("unknown");
    expect(repo.tickets[0].parts_status).toBe("unknown");
    expect(notify).not.toHaveBeenCalled();
  });

  it("skips a Generel ticket and leaves a manually ordered ticket alone", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("new", { store_id: null })], links });
    expect(await run(repo, client(0)).result).toBe("skipped");
    expect(repo.saves).toBe(0);
    const ordered = memoryPartsCheckRepo({ tickets: [ticket("new", { parts_status: "ordered" })], links });
    expect(await run(ordered, client(0)).result).toBe("skipped");
    expect(ordered.tickets[0].parts_status).toBe("ordered");
  });

  it("does not check services without linked parts", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("new")], links: [] });
    const c = client(0);
    expect(await run(repo, c).result).toBe("no_links");
    expect(c.getBalances).not.toHaveBeenCalled();
  });

  it("releases the mail claim when sending fails, so a later check can mail again", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("new")], links });
    const failing = vi.fn(async () => { throw new Error("smtp down"); });
    await expect(checkTicketParts("new", { repo, client: client(0), notify: failing, now: T0 })).resolves.toBe("needs_order");
    expect(repo.tickets[0].parts_notified_key).toBeNull();
  });

  it("looks up a missing part name in the catalog", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("new")], links: [{ ...links[0], part_name: null }] });
    await run(repo, client(0)).result;
    expect(repo.tickets[0].parts_shortage?.[0].name).toBe("Fra katalog");
  });
});

describe("shortageKey", () => {
  it("is stable regardless of order and changes when the shortage changes", () => {
    const a = { shared_sku: "A", name: "a", needed: 1, available: 0 };
    const b = { shared_sku: "B", name: "b", needed: 2, available: 1 };
    expect(shortageKey([a, b])).toBe(shortageKey([b, a]));
    expect(shortageKey([a])).not.toBe(shortageKey([{ ...a, needed: 2 }]));
    expect(shortageKey([a])).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("recheckUnknownTickets", () => {
  it("rechecks open unknown tickets once the lagersystem is back", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("new", { parts_status: "unknown" }), ticket("done", { parts_status: "unknown", status: "afhentet" })], links });
    expect(await recheckUnknownTickets({ repo, client: client(5), notify: vi.fn(async () => {}), now: T0 })).toBe(1);
    expect(repo.tickets[0].parts_status).toBe("ok");
  });

  it("retries a mail whose send failed, on the next recheck, and mails once", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("new")], links });
    await checkTicketParts("new", { repo, client: client(0), notify: vi.fn(async () => { throw new Error("smtp"); }), now: T0 });
    expect(repo.tickets[0].parts_status).toBe("needs_order");
    const notify = vi.fn(async () => {});
    expect(await recheckUnknownTickets({ repo, client: client(0), notify, now: T0 })).toBe(1);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(await recheckUnknownTickets({ repo, client: client(0), notify, now: T0 })).toBe(0);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("stops after the first failed balance fetch when the lagersystem is down", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("a", { parts_status: "unknown" }), ticket("b", { parts_status: "unknown" }), ticket("c", { parts_status: "unknown" })], links });
    const c = client("down");
    expect(await recheckUnknownTickets({ repo, client: c, notify: vi.fn(async () => {}), now: T0 })).toBe(1);
    expect(c.getBalances).toHaveBeenCalledTimes(1);
  });

  it("shares one balance fetch per location across tickets when the lagersystem is up", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("a", { parts_status: "unknown" }), ticket("b", { parts_status: "unknown" })], links });
    const c = client(5);
    expect(await recheckUnknownTickets({ repo, client: c, notify: vi.fn(async () => {}), now: T0 })).toBe(2);
    expect(c.getBalances).toHaveBeenCalledTimes(1);
  });

  it("clears the mail key on ok and no_links but keeps it on unknown", async () => {
    const key = "k";
    const ok = memoryPartsCheckRepo({ tickets: [ticket("new", { parts_status: "needs_order", parts_notified_key: key })], links });
    await checkTicketParts("new", { repo: ok, client: client(5), notify: vi.fn(async () => {}), now: T0 });
    expect(ok.tickets[0].parts_notified_key).toBeNull();
    const none = memoryPartsCheckRepo({ tickets: [ticket("new", { parts_status: "needs_order", parts_notified_key: key })], links: [] });
    await checkTicketParts("new", { repo: none, client: client(5), notify: vi.fn(async () => {}), now: T0 });
    expect(none.tickets[0].parts_notified_key).toBeNull();
    const down = memoryPartsCheckRepo({ tickets: [ticket("new", { parts_status: "needs_order", parts_notified_key: key })], links });
    await checkTicketParts("new", { repo: down, client: client("down"), notify: vi.fn(async () => {}), now: T0 });
    expect(down.tickets[0].parts_notified_key).toBe(key);
  });

  it("mails again when the same shortage returns after a resolved check", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("new")], links });
    const notify = vi.fn(async () => {});
    await checkTicketParts("new", { repo, client: client(0), notify, now: T0 });
    await checkTicketParts("new", { repo, client: client(5), notify, now: T0 });
    await checkTicketParts("new", { repo, client: client(0), notify, now: T0 });
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("does not throw when releasing the claim fails", async () => {
    const repo = memoryPartsCheckRepo({ tickets: [ticket("new")], links });
    repo.releaseNotification = async () => { throw new Error("db"); };
    await expect(checkTicketParts("new", { repo, client: client(0), notify: vi.fn(async () => { throw new Error("smtp"); }), now: T0 })).resolves.toBe("needs_order");
  });
});

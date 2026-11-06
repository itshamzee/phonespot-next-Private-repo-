// @vitest-environment node
import { expect, it } from "vitest";
import { clearShortageForPart, markOrdered } from "../parts-status";
import type { TicketForCheck } from "../parts-check-run";
import { memoryPartsCheckRepo } from "./memory-parts-check-repo";

const line = (sku: string) => ({ shared_sku: sku, name: sku, needed: 1, available: 0 });
const ticket = (over: Partial<TicketForCheck>): TicketForCheck => ({
  id: "t", store_id: "vejle", status: "modtaget", parts_status: null, parts_shortage: null, parts_notified_key: null,
  ticket_number: null, device_model: "iPhone 13", customer_name: "K", booking_details: null, services: null, ...over,
});

it("markOrdered only moves needs_order to ordered", async () => {
  const repo = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "needs_order", parts_shortage: [line("A")] })], links: [] });
  expect(await markOrdered(repo, "t")).toBe(true);
  expect(repo.tickets[0].parts_status).toBe("ordered");
  expect(await markOrdered(repo, "t")).toBe(false);
});

it("adding the missing part under Dele brugt clears the badge", async () => {
  const repo = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "ordered", parts_shortage: [line("A")] })], links: [] });
  expect(await clearShortageForPart(repo, "t", "A")).toBe(true);
  expect(repo.tickets[0]).toMatchObject({ parts_status: "ok", parts_shortage: null });
});

it("adding an unrelated part changes nothing", async () => {
  const repo = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "needs_order", parts_shortage: [line("A")] })], links: [] });
  expect(await clearShortageForPart(repo, "t", "B")).toBe(false);
  expect(repo.saves).toBe(0);
});

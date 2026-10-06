import { describe, expect, it } from "vitest";
import {
  discountPercentForServiceCount,
  parseBookingDevices,
  parseTicketIdList,
  priceBookingDevices,
  type BookingDevice,
} from "../booking-devices";

const dev = (price: number, glass = false): BookingDevice => ({
  device_type: "Apple",
  device_model: "iPhone",
  service_type: "x",
  selected_services: [{ id: "s", name: "x", price_dkk: price }],
  includes_tempered_glass: glass,
});

describe("priceBookingDevices", () => {
  it("allocates the discount so the shares add up to the group total", () => {
    const r = priceBookingDevices([dev(1001), dev(1003, true), dev(333)], 15);
    expect(r.subtotal).toBe(1001 + 1003 + 99 + 333);
    expect(r.discount).toBe(Math.round(r.subtotal * 0.15));
    expect(r.devices.reduce((s, d) => s + d.discount_dkk, 0)).toBe(r.discount);
    expect(r.devices.reduce((s, d) => s + d.total_price_dkk, 0)).toBe(r.total);
  });

  it("uses the wizard discount ladder", () => {
    expect([1, 2, 3, 5].map(discountPercentForServiceCount)).toEqual([0, 10, 15, 15]);
  });
});

describe("parseBookingDevices", () => {
  it("falls back to the flat fields without devices[]", () => {
    const r = parseBookingDevices({
      device_type: "Apple",
      device_model: "iPhone 15",
      selected_services: [{ id: "a", name: "n", price_dkk: 1 }],
    });
    expect(r).toMatchObject({ ok: true, multi: false });
  });

  it("rejects a device without services", () => {
    const r = parseBookingDevices({ devices: [dev(1), { ...dev(1), selected_services: [] }] });
    expect(r.ok).toBe(false);
  });
});

describe("parseTicketIdList", () => {
  it("prefers the list and falls back to the single id", () => {
    expect(parseTicketIdList({ repair_ticket_ids: "a,b", repair_ticket_id: "a" })).toEqual(["a", "b"]);
    expect(parseTicketIdList({ repair_ticket_id: "a" })).toEqual(["a"]);
  });
});

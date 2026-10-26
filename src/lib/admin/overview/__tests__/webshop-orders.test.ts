import { describe, expect, it } from "vitest";
import { ageLabel, isOverdue, isPickup, shapeWebshopOrders, shippingLabel } from "../webshop-orders";

const NOW = new Date("2026-10-26T10:00:00Z");

describe("webshop-ordrer", () => {
  it("danske leveringstekster", () => {
    expect(shippingLabel("pickup_slagelse")).toBe("Hent i Slagelse");
    expect(shippingLabel("pickup_vejle")).toBe("Hent i Vejle");
    expect(shippingLabel("postnord")).toBe("PostNord");
    expect(shippingLabel("dao")).toBe("DAO");
    expect(shippingLabel("pakkeshop")).toBe("Pakkeshop");
    expect(shippingLabel(null)).toBe("Ukendt levering");
    expect(isPickup("pickup_vejle")).toBe(true);
    expect(isPickup("dao")).toBe(false);
  });

  it("alder og forsinkelse", () => {
    expect(ageLabel(0)).toBe("i dag");
    expect(ageLabel(1)).toBe("i går");
    expect(ageLabel(3)).toBe("3 dage");
    expect(isOverdue(2)).toBe(false);
    expect(isOverdue(3)).toBe(true);
  });

  it("former rækker: kunde, antal, beløb og forsinkelse", () => {
    const out = shapeWebshopOrders(
      [
        {
          id: "a",
          order_number: "PS-1001",
          shipping_method: "pickup_slagelse",
          total: 129_900,
          created_at: "2026-10-20T08:00:00Z",
          confirmed_at: "2026-10-20T08:05:00Z",
          customer: [{ name: " Jens Hansen " }],
          order_items: [{ quantity: 1 }, { quantity: 2 }],
        },
        {
          id: "b",
          order_number: null,
          shipping_method: "dao",
          total: null,
          created_at: "2026-10-26T07:00:00Z",
          confirmed_at: null,
          customer: null,
          order_items: null,
        },
      ],
      12,
      NOW,
    );
    expect(out.total).toBe(12);
    expect(out.items[0]).toMatchObject({
      number: "PS-1001", customer: "Jens Hansen", items: 3, total: 129_900,
      shipping: "Hent i Slagelse", pickup: true, age: "6 dage", overdue: true,
    });
    expect(out.items[1]).toMatchObject({ number: "Ordre", customer: "Ukendt kunde", items: 0, age: "i dag", overdue: false, pickup: false });
  });
});

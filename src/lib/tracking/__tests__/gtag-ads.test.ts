import { describe, it, expect, beforeEach, vi } from "vitest";
import { trackAdsPurchase } from "../gtag-ads";

describe("trackAdsPurchase", () => {
  beforeEach(() => {
    localStorage.clear();
    window.gtag = vi.fn();
  });

  it("tæller en ordre én gang, også når kvitteringen genindlæses", () => {
    const order = { orderId: "o1", orderNumber: "PS-1001", value: 199 };
    trackAdsPurchase(order);
    trackAdsPurchase(order);
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith("event", "manual_event_PURCHASE", {
      transaction_id: "PS-1001",
      value: 199,
      currency: "DKK",
    });
  });

  it("tæller to forskellige ordrer hver for sig", () => {
    trackAdsPurchase({ orderId: "o1", orderNumber: "PS-1001", value: 199 });
    trackAdsPurchase({ orderId: "o2", orderNumber: "PS-1002", value: 299 });
    expect(window.gtag).toHaveBeenCalledTimes(2);
  });

  it("markerer ikke ordren som sendt, når gtag mangler", () => {
    window.gtag = undefined;
    trackAdsPurchase({ orderId: "o1", orderNumber: "PS-1001", value: 199 });
    window.gtag = vi.fn();
    trackAdsPurchase({ orderId: "o1", orderNumber: "PS-1001", value: 199 });
    expect(window.gtag).toHaveBeenCalledTimes(1);
  });
});

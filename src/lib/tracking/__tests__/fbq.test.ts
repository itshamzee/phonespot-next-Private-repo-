import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackPurchase } from "../fbq";

const order = { orderId: "order-1", value: 3676, contentIds: ["tmpl-1"], numItems: 1 };

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  delete window.fbq;
});
afterEach(() => {
  vi.useRealTimers();
  delete window.fbq;
});

describe("trackPurchase", () => {
  it("venter på pixlen, når fbq først findes efter sidens effect (hård indlæsning fra Stripe)", () => {
    trackPurchase(order);
    const fbq = vi.fn();
    vi.advanceTimersByTime(300);
    window.fbq = fbq; // pixel-snippet'et kører nu (next/script afterInteractive)
    vi.advanceTimersByTime(200);
    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Purchase",
      { content_ids: ["tmpl-1"], content_type: "product", value: 3676, currency: "DKK", num_items: 1 },
      { eventID: "purchase_order-1" },
    );
  });

  it("sender med det samme, når fbq allerede findes", () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    trackPurchase(order);
    expect(fbq).toHaveBeenCalledTimes(1);
  });

  it("sender kun én gang pr. ordre pr. session", () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    trackPurchase(order);
    trackPurchase(order);
    expect(fbq).toHaveBeenCalledTimes(1);
  });

  it("giver op efter 10 sek. uden pixel (fx adblock)", () => {
    trackPurchase(order);
    vi.advanceTimersByTime(11_000);
    const fbq = vi.fn();
    window.fbq = fbq;
    vi.advanceTimersByTime(1_000);
    expect(fbq).not.toHaveBeenCalled();
  });
});

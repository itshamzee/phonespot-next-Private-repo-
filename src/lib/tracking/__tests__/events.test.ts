import { beforeEach, describe, expect, it, vi } from "vitest";

const readStoredConsent = vi.fn();
vi.mock("@/lib/consent-client", () => ({ readStoredConsent: () => readStoredConsent() }));

import {
  captureAttribution,
  getAttribution,
  normalizeTrackStore,
  storeFromPath,
  trackClickToCall,
  trackGa4Purchase,
  trackGetDirections,
  trackLead,
  trackMessagingClick,
  trackRepairBooking,
} from "../events";
import { classifyHref } from "@/components/tracking/global-click-tracker";

const gtag = vi.fn();
const fbq = vi.fn();

beforeEach(() => {
  gtag.mockReset();
  fbq.mockReset();
  readStoredConsent.mockReset().mockReturnValue("accepted");
  window.gtag = gtag;
  window.fbq = fbq;
  sessionStorage.clear();
  window.history.pushState({}, "", "/");
});

describe("trackRepairBooking", () => {
  it("sends GA4 event and Meta Schedule with the same event id", () => {
    const id = trackRepairBooking({ store: "vejle", brand: "Apple", model: "iPhone 13", service: "Skærm", value: 1299 });
    expect(gtag).toHaveBeenCalledWith("event", "repair_booking", {
      store: "vejle", brand: "Apple", model: "iPhone 13", service: "Skærm", value: 1299, currency: "DKK", event_id: id,
    });
    expect(fbq).toHaveBeenCalledWith(
      "track", "Schedule",
      expect.objectContaining({ value: 1299, currency: "DKK", content_name: "Apple iPhone 13" }),
      { eventID: id },
    );
  });

  it("uses a supplied event id and drops undefined params", () => {
    trackRepairBooking({ store: "indsend", eventId: "repair_abc" });
    const params = gtag.mock.calls[0][2];
    expect(params.event_id).toBe("repair_abc");
    expect("brand" in params).toBe(false);
  });
});

describe("consent", () => {
  it("does not call Meta without accepted consent but still calls gtag (Consent Mode handles it)", () => {
    readStoredConsent.mockReturnValue(null);
    trackClickToCall({ store: "vejle", pagePath: "/butik/vejle" });
    expect(fbq).not.toHaveBeenCalled();
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("is a no-op without gtag/fbq loaded", () => {
    window.gtag = undefined;
    window.fbq = undefined;
    expect(() => trackLead({ leadType: "contact_form" })).not.toThrow();
  });
});

describe("other events", () => {
  it("click_to_call -> Contact", () => {
    const id = trackClickToCall({ store: "slagelse", pagePath: "/kontakt", phone: "+4561100048" });
    expect(gtag).toHaveBeenCalledWith("event", "click_to_call", expect.objectContaining({ store: "slagelse", page_path: "/kontakt", event_id: id }));
    expect(fbq.mock.calls[0].slice(0, 2)).toEqual(["track", "Contact"]);
  });

  it("get_directions -> FindLocation", () => {
    trackGetDirections({ store: "vejle", pagePath: "/butik" });
    expect(gtag.mock.calls[0][1]).toBe("get_directions");
    expect(fbq.mock.calls[0][1]).toBe("FindLocation");
  });

  it("generate_lead -> Lead, with and without value", () => {
    trackLead({ leadType: "buyback", store: "indsend" });
    expect(gtag.mock.calls[0][2].currency).toBeUndefined();
    expect(fbq.mock.calls[0][1]).toBe("Lead");
  });

  it("messaging clicks use channel in event name", () => {
    trackMessagingClick({ channel: "messenger", store: "webshop", pagePath: "/" });
    expect(gtag.mock.calls[0][1]).toBe("click_to_messenger");
  });
});

describe("trackGa4Purchase", () => {
  const input = {
    transactionId: "PS-1001", value: 5000, shipping: 49,
    items: [{ item_id: "a", item_name: "iPhone", price: 5000, quantity: 1 }],
  };
  it("sends purchase with items once per transaction", () => {
    trackGa4Purchase(input);
    trackGa4Purchase(input);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "purchase", expect.objectContaining({ transaction_id: "PS-1001", currency: "DKK", items: input.items }));
  });
});

describe("attribution", () => {
  it("keeps the first touch and never overwrites", () => {
    window.history.pushState({}, "", "/?utm_source=google&utm_medium=cpc&gclid=abc");
    captureAttribution();
    window.history.pushState({}, "", "/?utm_source=facebook&fbclid=zzz");
    captureAttribution();
    expect(getAttribution()).toEqual({ utm_source: "google", utm_medium: "cpc", gclid: "abc" });
  });

  it("returns empty object when storage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(getAttribution()).toEqual({});
    spy.mockRestore();
  });
});

describe("helpers", () => {
  it("derives store from path and free text", () => {
    expect(storeFromPath("/reparation-vejle")).toBe("vejle");
    expect(storeFromPath("/butik/slagelse")).toBe("slagelse");
    expect(storeFromPath("/iphones")).toBe("webshop");
    expect(normalizeTrackStore("Send ind")).toBe("indsend");
    expect(normalizeTrackStore(null, "indsend")).toBe("indsend");
  });

  it("classifies hrefs", () => {
    expect(classifyHref("tel:+4561100048")).toBe("call");
    expect(classifyHref("https://www.google.com/maps/dir/?api=1&destination=Vejle")).toBe("directions");
    expect(classifyHref("https://maps.app.goo.gl/xyz")).toBe("directions");
    expect(classifyHref("https://maps.apple.com/?q=x")).toBe("directions");
    expect(classifyHref("https://m.me/123")).toBe("messenger");
    expect(classifyHref("https://wa.me/4561100048")).toBe("whatsapp");
    expect(classifyHref("/reparation")).toBeNull();
    expect(classifyHref("mailto:info@phonespot.dk")).toBeNull();
  });
});

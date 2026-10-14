import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

vi.mock("@/lib/consent-client", () => ({ readStoredConsent: () => "accepted" }));

import { GlobalClickTracker } from "../global-click-tracker";

const gtag = vi.fn();
const fbq = vi.fn();

beforeEach(() => {
  gtag.mockReset();
  fbq.mockReset();
  window.gtag = gtag;
  window.fbq = fbq;
  window.history.pushState({}, "", "/reparation-vejle");
});

function setup(html: string) {
  render(
    <>
      <GlobalClickTracker />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>,
  );
}

describe("GlobalClickTracker", () => {
  it("tracks a click on a nested element inside a tel: link", () => {
    setup('<a href="tel:+4561100048"><span id="t">Ring</span></a>');
    fireEvent.click(document.getElementById("t")!);
    expect(gtag).toHaveBeenCalledWith("event", "click_to_call", expect.objectContaining({ store: "vejle", page_path: "/reparation-vejle" }));
    expect(fbq.mock.calls[0][1]).toBe("Contact");
  });

  it("tracks directions links", () => {
    setup('<a id="d" href="https://maps.google.com/?q=Slagelse">Find vej</a>');
    fireEvent.click(document.getElementById("d")!);
    expect(gtag).toHaveBeenCalledWith("event", "get_directions", expect.objectContaining({ store: "slagelse" }));
  });

  it("ignores ordinary links and admin pages", () => {
    setup('<a id="a" href="/iphones">x</a><a id="b" href="tel:123">y</a>');
    fireEvent.click(document.getElementById("a")!);
    window.history.pushState({}, "", "/admin/kunder");
    fireEvent.click(document.getElementById("b")!);
    expect(gtag).not.toHaveBeenCalled();
  });
});

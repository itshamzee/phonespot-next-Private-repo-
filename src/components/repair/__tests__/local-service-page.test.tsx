import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocalServicePage } from "@/components/repair/local-service-page";
import { getLocalServicePage } from "@/lib/local-service-pages";

describe("LocalServicePage", () => {
  it("viser H1, live priser, adresse og schema med tilbud", () => {
    const page = getLocalServicePage("slagelse", "playstation")!;
    const { container } = render(
      <LocalServicePage
        page={page}
        rows={[
          {
            brandSlug: "playstation",
            modelSlug: "playstation-5",
            modelName: "PlayStation 5",
            prices: { bundle: 1300, hdmi: 1599, fan: 899, paste: null },
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("PS5- og konsolreparation i Slagelse");
    expect(screen.getByRole("link", { name: "PlayStation 5" }).getAttribute("href")).toBe(
      "/reparation/playstation/playstation-5",
    );
    expect(container.textContent).toContain("1.300 kr.");
    expect(container.textContent).toContain("VestsjællandsCentret 10A, 103");
    // Andre ydelser i samme by og samme ydelse i den anden by linkes.
    expect(container.querySelector('a[href="/reparation-slagelse/ipad"]')).not.toBeNull();
    expect(container.querySelector('a[href="/reparation-vejle/playstation"]')).not.toBeNull();

    const ld = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) =>
      JSON.parse(s.textContent ?? "{}"),
    );
    const business = ld.find((d) => d["@type"] === "ElectronicsRepair");
    expect(business.address.addressLocality).toBe("Slagelse");
    // Tre priser findes, termisk pasta mangler: tre tilbud.
    expect(business.hasOfferCatalog.itemListElement).toHaveLength(3);
    expect(ld.some((d) => d["@type"] === "FAQPage")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SELL_CITIES, SellCityPage, sellCityMetadata } from "@/components/sell-device/sell-city-page";

describe("lokale sælg-sider", () => {
  it.each(SELL_CITIES)("$city har én H1, egen canonical, kort titel og ingen priser", (city) => {
    const { container } = render(<SellCityPage slug={city.slug} />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelector("h1")?.textContent).toBe(`Sælg din telefon i ${city.city}`);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\d[\d.]*\s*(kr\b|kroner)/i);
    expect(text).not.toMatch(/Storcenter|Vardevej|6715/);

    const meta = sellCityMetadata(city.slug);
    expect(meta.alternates?.canonical).toBe(`https://phonespot.dk/saelg-din-enhed/${city.slug}`);
    expect((meta.title as { absolute: string }).absolute.length).toBeLessThanOrEqual(60);
    expect(meta.description?.length ?? 0).toBeLessThanOrEqual(160);

    const schemas = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) =>
      JSON.parse(s.textContent ?? "{}"),
    );
    expect(schemas.find((s) => s["@type"] === "Service").areaServed.name).toBe(city.city);
    const faq = schemas.find((s) => s["@type"] === "FAQPage");
    expect(faq.mainEntity).toHaveLength(container.querySelectorAll("details").length);
  });

  it("siger ligeud, at der ikke er butik i byer uden butik", () => {
    for (const city of SELL_CITIES.filter((entry) => !entry.local)) {
      const { container, unmount } = render(<SellCityPage slug={city.slug} />);
      expect(container.textContent).toContain(`Vi har ikke butik i ${city.city}`);
      expect(container.textContent).toContain("Løversysselvej 3B");
      unmount();
    }
  });

  it("Slagelse-siden peger på butikken i VestsjællandsCentret", () => {
    const { container } = render(<SellCityPage slug="slagelse" />);
    expect(container.textContent).toContain("VestsjællandsCentret");
  });
});

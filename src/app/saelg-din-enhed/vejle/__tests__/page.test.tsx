import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import Page, { metadata } from "../page";

describe("/saelg-din-enhed/vejle", () => {
  it("er en lokal sælg-side for Vejle uden priser", () => {
    const { container } = render(<Page />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelector("h1")?.textContent).toBe("Sælg din telefon i Vejle");
    const text = container.textContent ?? "";
    expect(text).toContain("Løversysselvej 3B");
    expect(text).toContain("Pengene samme dag, som vi modtager enheden");
    expect(text).not.toMatch(/\d[\d.]*\s*(kr\b|kroner)/i);
    expect(text).not.toMatch(/Storcenter|Vardevej|6715/);

    const schemas = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) =>
      JSON.parse(s.textContent ?? "{}"),
    );
    const service = schemas.find((s) => s["@type"] === "Service");
    expect(service.provider.address.addressLocality).toBe("Vejle");
    const faq = schemas.find((s) => s["@type"] === "FAQPage");
    expect(faq.mainEntity).toHaveLength(container.querySelectorAll("details").length);
  });

  it("har egen canonical og titel under 60 tegn", () => {
    expect(metadata.alternates?.canonical).toBe("https://phonespot.dk/saelg-din-enhed/vejle");
    const title = (metadata.title as { absolute: string }).absolute;
    expect(title.length).toBeLessThanOrEqual(60);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase/repairs", () => ({
  getRepairPriceSummaries: vi.fn(async () => [
    { brandSlug: "iphone", modelSlug: "iphone-15", modelName: "iPhone 15", screenFrom: 999, screenOriginal: 1799, battery: 499 },
    { brandSlug: "iphone", modelSlug: "iphone-13", modelName: "iPhone 13", screenFrom: 699, screenOriginal: null, battery: 449 },
  ]),
}));

import FactsPage, { metadata } from "../page";

afterEach(cleanup);

const jsonLd = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) =>
    JSON.parse(s.textContent!),
  );

describe("/reparation/priser", () => {
  it("states prices, warranty, wait time and both stores", async () => {
    const { container } = render(await FactsPage());
    const text = container.textContent ?? "";
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Vejle og Slagelse");
    expect(text).toContain("699 kr. til 999 kr.");
    expect(text).toContain("livstidsgaranti på arbejde og dele");
    expect(text).toContain("3 måneders garanti");
    expect(text).toContain("90 % af skærm- og batteriskift er klar på 30 minutter");
    expect(text).toContain("Løversysselvej 3B");
    expect(text).toContain("VestsjællandsCentret 10A, 103");
    expect(text).not.toMatch(/\d,\d ud af 5/);
    expect(text).toMatch(/Priser opdateret:/);
    expect(text).not.toMatch(/36 m(dr|åneder)/);
  });

  it("emits FAQPage matching the visible FAQ and Organization with sameAs", async () => {
    const { container } = render(await FactsPage());
    const blocks = jsonLd(container);
    const faq = blocks.find((b) => b["@type"] === "FAQPage");
    for (const q of faq.mainEntity) expect(container.textContent).toContain(q.acceptedAnswer.text);
    const org = blocks.find((b) => b["@type"] === "Organization");
    expect(org.sameAs).toContain("https://dk.trustpilot.com/review/phonespot.dk");
    expect(org.department).toHaveLength(2);
  });

  it("has a canonical and length-safe metadata", () => {
    expect(metadata.alternates?.canonical).toBe("https://phonespot.dk/reparation/priser");
    expect(String(metadata.title).length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeLessThanOrEqual(160);
  });
});

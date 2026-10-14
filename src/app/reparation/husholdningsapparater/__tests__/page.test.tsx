import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import Page, { metadata } from "../page";
import { FAQS, HERO_ANSWER } from "../data";

afterEach(cleanup);

const AUTH_FAQ = FAQS[0];

function jsonLd(container: HTMLElement) {
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) =>
    JSON.parse(s.textContent!),
  );
}

describe("/reparation/husholdningsapparater", () => {
  it("renders sections, prices and store info", () => {
    const { container } = render(<Page />);
    const text = container.textContent!;
    for (const h of ["Ledningsfri støvsugere", "Robotstøvsugere", "Kaffemaskiner", "Controllere", "Sådan foregår det", "Batterier og sikkerhed", "Find os"]) {
      expect(text).toContain(h);
    }
    expect(text).toContain("799 kr.");
    expect(text).toContain("1.849 kr.");
    expect(text).toContain("Fast pris efter tjek");
    expect(text).toContain("Nintendo reparerer Joy-Con-drift gratis i EU. Kontakt Nintendo først.");
    expect(text).toContain("Løversysselvej 3B");
    expect(text).toContain("VestsjællandsCentret 10A, 103");
    expect(text).not.toContain("Ikke endnu");
    expect(text).not.toContain("Airwrap");
    expect(container.querySelectorAll("figure").length).toBe(0);
  });

  it("has a 40-60 word answer-first paragraph", () => {
    const words = HERO_ANSWER.split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(60);
  });

  it("never claims authorisation or lifetime/36-month warranty outside the FAQ denial", () => {
    const { container } = render(<Page />);
    let text = container.textContent!;
    text = text.split(AUTH_FAQ.question).join("").split(AUTH_FAQ.answer).join("");
    expect(text.toLowerCase()).not.toMatch(/autoriser|officiel|certificer|livstid|36 m/);
    expect(AUTH_FAQ.answer).toMatch(/^Nej, vi er .* ikke /);
    expect(container.textContent).toContain("12 måneders garanti på dele og arbejde");
  });

  it("emits BreadcrumbList, Service and FAQPage JSON-LD without ratings", () => {
    const { container } = render(<Page />);
    const blocks = jsonLd(container);
    const types = blocks.map((b) => b["@type"]);
    expect(types).toEqual(["BreadcrumbList", "Service", "FAQPage"]);
    const svc = blocks.find((b) => b["@type"] === "Service");
    expect(svc.provider).toHaveLength(2);
    expect(svc.areaServed.map((a: { name: string }) => a.name)).toEqual(["Vejle", "Slagelse"]);
    const faq = blocks.find((b) => b["@type"] === "FAQPage");
    expect(faq.mainEntity).toHaveLength(8);
    const visible = Array.from(container.querySelectorAll("details summary")).map((s) => s.textContent);
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(visible);
    expect(JSON.stringify(blocks)).not.toContain("aggregateRating");
  });

  it("has canonical and length-safe metadata", () => {
    expect(metadata.alternates?.canonical).toBe("https://phonespot.dk/reparation/husholdningsapparater");
    expect(String(metadata.title).length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase/repairs", () => ({
  getRepairPriceSummaries: vi.fn(async () => [
    {
      brandSlug: "iphone",
      modelSlug: "iphone-15",
      modelName: "iPhone 15",
      screenFrom: 999,
      screenOriginal: 1799,
      battery: 499,
    },
  ]),
}));

import HorsensPage, { metadata } from "../page";
import KoldingPage, { metadata as koldingMetadata } from "../../reparation-kolding/page";
import SlagelsePage, { metadata as slagelseMetadata } from "../../reparation-slagelse/page";
import FredericiaPage, { metadata as frederMetadata } from "../../reparation-fredericia/page";
import HedenstedPage, { metadata as hedenstedMetadata } from "../../reparation-hedensted/page";
import NaestvedPage, { metadata as naestvedMetadata } from "../../reparation-naestved/page";

afterEach(cleanup);

const jsonLd = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) =>
    JSON.parse(s.textContent!),
  );

describe("local repair town pages", () => {
  it("renders the Horsens H1, price row and mail-in CTA", async () => {
    render(await HorsensPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Mobilreparation til dig i Horsens");
    expect(screen.getByRole("link", { name: "iPhone 15" })).toHaveAttribute("href", "/reparation/iphone/iphone-15");
    const mailIn = screen.getAllByRole("link", { name: "Send din telefon ind" });
    expect(mailIn.length).toBeGreaterThan(0);
    for (const link of mailIn) expect(link).toHaveAttribute("href", "/reparation/indsend");
    const book = screen.getAllByRole("link", { name: "Book og kom forbi i Vejle" });
    for (const link of book) expect(link).toHaveAttribute("href", "/reparation/booking?store=vejle");
  });

  it("emits FAQPage and ElectronicsRepair JSON-LD with areaServed", async () => {
    const { container } = render(await HorsensPage());
    const blocks = jsonLd(container);
    const faq = blocks.find((b) => b["@type"] === "FAQPage");
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(4);
    expect(faq.mainEntity.length).toBeLessThanOrEqual(6);
    const business = blocks.find((b) => b["@type"] === "ElectronicsRepair");
    expect(business.name).toBe("PhoneSpot Vejle");
    expect(business.areaServed).toMatchObject({ name: "Horsens" });
  });

  it.each([
    [metadata, "/reparation-horsens"],
    [koldingMetadata, "/reparation-kolding"],
    [frederMetadata, "/reparation-fredericia"],
    [slagelseMetadata, "/reparation-slagelse"],
    [hedenstedMetadata, "/reparation-hedensted"],
    [naestvedMetadata, "/reparation-naestved"],
  ])("has its own canonical and length-safe metadata (%#)", (meta, path) => {
    expect(meta.alternates?.canonical).toBe(`https://phonespot.dk${path}`);
    expect(String(meta.title).length).toBeLessThanOrEqual(60);
    expect(String(meta.description).length).toBeLessThanOrEqual(155);
  });

  it("points Slagelse at its own store without claiming free parking", async () => {
    const { container } = render(await SlagelsePage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Slagelse");
    expect(container.textContent).not.toMatch(/gratis parkering/i);
    const book = screen.getAllByRole("link", { name: "Book og kom forbi i Slagelse" });
    for (const link of book) expect(link).toHaveAttribute("href", "/reparation/booking?store=slagelse");
  });

  it("keeps each town page's copy unique", async () => {
    const a = render(await HorsensPage()).container.textContent;
    cleanup();
    const b = render(await KoldingPage()).container.textContent;
    cleanup();
    const c = render(await FredericiaPage()).container.textContent;
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).toContain("Hedensted");
  });

  it("renders Hedensted as a Vejle satellite town", async () => {
    const { container } = render(await HedenstedPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Mobilreparation til dig i Hedensted");
    const business = jsonLd(container).find((b) => b["@type"] === "ElectronicsRepair");
    expect(business.name).toBe("PhoneSpot Vejle");
    expect(business.areaServed).toMatchObject({ name: "Hedensted" });
  });

  it("renders Næstved as an honest Slagelse satellite (no store in Næstved, mail-in offered)", async () => {
    const { container } = render(await NaestvedPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Mobilreparation til dig i Næstved");
    expect(container.textContent).toMatch(/Vi har ikke en butik i Næstved/);
    expect(container.textContent).not.toMatch(/gratis parkering/i);
    const business = jsonLd(container).find((b) => b["@type"] === "ElectronicsRepair");
    expect(business.name).toBe("PhoneSpot Slagelse");
    expect(business.areaServed).toMatchObject({ name: "Næstved" });
    const book = screen.getAllByRole("link", { name: "Book og kom forbi i Slagelse" });
    for (const link of book) expect(link).toHaveAttribute("href", "/reparation/booking?store=slagelse");
    expect(screen.getByRole("link", { name: "Reparation i Slagelse" })).toHaveAttribute("href", "/reparation-slagelse");
  });

  it("links Slagelse to its satellite towns and states the battery warranty", async () => {
    const { container } = render(await SlagelsePage());
    expect(screen.getByRole("link", { name: "Reparation for Næstved" })).toHaveAttribute("href", "/reparation-naestved");
    expect(container.textContent).toMatch(/6 måneder på batteriskift/);
  });

  it("opens every town page with an answer-first paragraph naming the address", async () => {
    for (const [Page, street] of [
      [HorsensPage, "Løversysselvej 3B"],
      [NaestvedPage, "VestsjællandsCentret 10A, 103"],
      [SlagelsePage, "VestsjællandsCentret 10A, 103"],
    ] as const) {
      const { container } = render(await Page());
      const first = container.querySelector("section.border-b p");
      expect(first?.textContent).toContain(street);
      expect(first?.textContent).toMatch(/livstidsgaranti/);
      const words = (first?.textContent ?? "").trim().split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(30);
      expect(words).toBeLessThanOrEqual(75);
      cleanup();
    }
  });
});

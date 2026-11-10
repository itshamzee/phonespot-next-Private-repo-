import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Page, { generateMetadata, generateStaticParams } from "../page";
import { IPHONE_SELL_PAGES } from "../models";

vi.mock("@/components/sell-device/sell-device-wizard", () => ({
  SellDeviceWizard: () => <div data-testid="sell-wizard" />,
}));
afterEach(cleanup);

const BANNED = [/foxway/i, /dropship/i, /panserglas/i, /certificerede teknikere/i, /30\+ tests/i, /esbjerg/i, /original kasse/i];
const params = (model: string) => ({ params: Promise.resolve({ model }) });

describe("iPhone-sider under /saelg-din-enhed/iphone/[model]", () => {
  it("bygger en side pr. model fra iPhone 11 og op plus defekt", () => {
    const slugs = generateStaticParams().map(({ model }) => model);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of ["iphone-11", "iphone-11-pro-max", "iphone-13-mini", "iphone-16e", "iphone-air", "iphone-duo", "defekt"]) {
      expect(slugs).toContain(slug);
    }
    expect(slugs.join(" ")).not.toMatch(/iphone-(x|xr|xs|8|7)\b/);
  });

  it("giver unik titel under 66 tegn, beskrivelse og egen canonical", async () => {
    const titles = new Set<string>();
    for (const page of IPHONE_SELL_PAGES) {
      const meta = await generateMetadata(params(page.slug));
      expect(String(meta.title), page.slug).toMatch(/^Sælg /);
      expect(String(meta.title).length, page.slug).toBeLessThanOrEqual(66);
      expect(String(meta.description).length, page.slug).toBeGreaterThan(80);
      expect(String(meta.description).length, page.slug).toBeLessThanOrEqual(170);
      expect(meta.alternates?.canonical).toBe(`https://phonespot.dk/saelg-din-enhed/iphone/${page.slug}`);
      titles.add(String(meta.title));
    }
    expect(titles.size).toBe(IPHONE_SELL_PAGES.length);
  });

  it("returnerer 404 for ukendt model", async () => {
    expect(await generateMetadata(params("iphone-x"))).toEqual({});
    await expect(Page(params("iphone-x"))).rejects.toThrow();
  });

  it("viser en H1, FAQ der matcher JSON-LD, og ingen priser eller forbudte ord", async () => {
    for (const page of IPHONE_SELL_PAGES) {
      const { container, unmount } = render(await Page(params(page.slug)));
      expect(container.querySelectorAll("h1"), page.slug).toHaveLength(1);
      const schemas = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent ?? "{}"));
      const faq = schemas.find((s) => s["@type"] === "FAQPage");
      expect(faq.mainEntity).toHaveLength(container.querySelectorAll("details").length);
      expect(new Set(faq.mainEntity.map((q: { name: string }) => q.name)).size).toBe(faq.mainEntity.length);
      const text = container.textContent ?? "";
      expect(text, page.slug).toContain("Pengene samme dag, som vi modtager enheden");
      expect(text, page.slug).not.toMatch(/\d[\d.]*\s*(kr\b|kroner)/i);
      expect(text, page.slug).not.toMatch(/med det samme|øjeblikkelig/i); // "samme dag" er tilladt fra 10/11-2026 (ejerbeslutning: pengene samme dag, som vi modtager enheden)
      for (const pattern of BANNED) expect(text).not.toMatch(pattern);
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      unmount();
    }
  });

  it("linker defekt-siden og hver model til iPhone-hubben", async () => {
    for (const page of IPHONE_SELL_PAGES) {
      const { container, unmount } = render(await Page(params(page.slug)));
      const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
      expect(hrefs).toContain("/saelg-din-enhed/iphone");
      if (page.slug !== "defekt") expect(hrefs).toContain("/saelg-din-enhed/iphone/defekt");
      unmount();
    }
  });
});

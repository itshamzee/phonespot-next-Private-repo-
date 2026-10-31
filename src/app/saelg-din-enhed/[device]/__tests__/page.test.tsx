import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Page, { generateMetadata, generateStaticParams } from "../page";
import { SELL_DEVICES } from "../devices";

const wizardProps = vi.fn();
vi.mock("@/components/sell-device/sell-device-wizard", () => ({
  SellDeviceWizard: (props: unknown) => {
    wizardProps(props);
    return <div data-testid="sell-wizard" />;
  },
}));
afterEach(() => {
  cleanup();
  wizardProps.mockClear();
});

const SLUGS = ["iphone", "samsung", "ipad", "macbook", "apple-watch"];
const BANNED = [/foxway/i, /dropship/i, /panserglas/i, /certificerede teknikere/i, /30\+ tests/i, /esbjerg/i, /original kasse/i];
const params = (device: string) => ({ params: Promise.resolve({ device }) });

describe("Enhedssider under /saelg-din-enhed/[device]", () => {
  it("bygger præcis de fem kendte enhedssider", () => {
    expect(generateStaticParams()).toEqual(SLUGS.map((device) => ({ device })));
  });

  it("giver unik titel under 60 tegn, canonical og beskrivelse", async () => {
    const titles = new Set<string>();
    for (const slug of SLUGS) {
      const meta = await generateMetadata(params(slug));
      expect(String(meta.title).length).toBeLessThan(60);
      expect(String(meta.title)).toMatch(/^Sælg /);
      expect(meta.alternates?.canonical).toBe(`https://phonespot.dk/saelg-din-enhed/${slug}`);
      expect(String(meta.description).length).toBeGreaterThan(80);
      expect(String(meta.description).length).toBeLessThanOrEqual(170);
      titles.add(String(meta.title));
    }
    expect(titles.size).toBe(SLUGS.length);
  });

  it("returnerer 404 for ukendt slug", async () => {
    expect(await generateMetadata(params("nokia"))).toEqual({});
    await expect(Page(params("nokia"))).rejects.toThrow();
    await expect(Page(params("accepter"))).rejects.toThrow();
  });

  it("viser H1, wizard med forvalgt enhed, FAQ og JSON-LD, der matcher siden", async () => {
    for (const config of SELL_DEVICES) {
      const { container, unmount } = render(await Page(params(config.slug)));
      expect(container.querySelectorAll("h1")).toHaveLength(1);
      expect(container.querySelector("h1")?.textContent?.toLowerCase()).toContain(config.name.split(" ")[0].toLowerCase());
      expect(wizardProps).toHaveBeenCalledWith({ initialDevice: config.wizardPreset });

      const schemas = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) =>
        JSON.parse(s.textContent ?? "{}"),
      );
      const crumbs = schemas.find((s) => s["@type"] === "BreadcrumbList");
      expect(crumbs.itemListElement.at(-1).item).toBe(`https://phonespot.dk/saelg-din-enhed/${config.slug}`);
      const faq = schemas.find((s) => s["@type"] === "FAQPage");
      const details = Array.from(container.querySelectorAll("details"));
      expect(faq.mainEntity.length).toBeGreaterThanOrEqual(4);
      expect(faq.mainEntity.length).toBeLessThanOrEqual(6);
      expect(faq.mainEntity).toHaveLength(details.length);
      for (const q of faq.mainEntity) {
        const match = details.find((d) => d.querySelector("summary")?.textContent?.includes(q.name));
        expect(match?.querySelector("p")?.textContent).toBe(q.acceptedAnswer.text);
      }

      const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
      expect(hrefs).toContain("/saelg-din-enhed");
      unmount();
    }
  });

  it("lover fast pris via godkendt løfte 5 og lover ingen automatisk pris eller tal", async () => {
    for (const slug of SLUGS) {
      const { container, unmount } = render(await Page(params(slug)));
      const text = container.textContent ?? "";
      expect(text).toContain("Udbetaling inden 2 hverdage, og gratis retur hvis du afviser");
      expect(text).not.toMatch(/\d[\d.]*\s*(kr\b|kroner)/i);
      expect(text).not.toMatch(/med det samme|øjeblikkelig|automatisk (pris|tilbud)/i);
      unmount();
    }
  });

  it("indeholder ingen forbudte ord eller emojis", async () => {
    for (const slug of SLUGS) {
      const { container, unmount } = render(await Page(params(slug)));
      const text = container.textContent ?? "";
      for (const pattern of BANNED) expect(text).not.toMatch(pattern);
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      unmount();
    }
  });

  it("har 150-300 ord unik brødtekst og ingen gentagne afsnit mellem siderne", () => {
    const seen = new Map<string, string>();
    for (const device of SELL_DEVICES) {
      const paragraphs = [...device.body, device.coverage];
      const words = paragraphs.join(" ").split(/\s+/).length;
      expect(words, device.slug).toBeGreaterThanOrEqual(150);
      expect(words).toBeLessThanOrEqual(300);
      for (const text of [...paragraphs, device.answer, ...device.faq.map((f) => f.answer)]) {
        expect(seen.get(text)).toBeUndefined();
        seen.set(text, device.slug);
      }
    }
  });

  it("linker til de eksisterende blogindlæg fra iPhone-siden", async () => {
    const { container } = render(await Page(params("iphone")));
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/blog/hvad-er-din-brugte-iphone-vaerd");
    expect(hrefs).toContain("/blog/saelg-iphone-med-oedelagt-skaerm");
  });
});

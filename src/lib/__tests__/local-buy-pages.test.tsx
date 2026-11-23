import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LocalBuyPage, localBuyMetadata } from "@/components/local/local-buy-page";
import type { TemplateWithStock } from "@/components/product/filtered-grid";
import { LOCAL_BUY_PAGES, getLocalBuyPage, inStoreCount, localBuyFaqs } from "../local-buy-pages";
import { STORES } from "../store-config";

afterEach(cleanup);

const template = (slug: string, locations: TemplateWithStock["locations"], price = 239900) =>
  ({
    id: slug, slug, display_name: slug, brand: "Apple", category: "iphone", images: ["/images/x.jpg"],
    min_price: price, new_price: null, device_count: 3, locations, has_own_stock: true, specifications: {},
  }) as unknown as TemplateWithStock;

describe("lokale købssider", () => {
  it("har unikke titler og beskrivelser inden for Googles længder, med byen i titlen", () => {
    expect(LOCAL_BUY_PAGES).toHaveLength(4);
    expect(new Set(LOCAL_BUY_PAGES.map((page) => page.title)).size).toBe(4);
    expect(new Set(LOCAL_BUY_PAGES.map((page) => page.description)).size).toBe(4);
    for (const page of LOCAL_BUY_PAGES) {
      const city = STORES[page.store].city;
      expect(page.title.length, page.title).toBeLessThanOrEqual(60);
      expect(page.description.length, page.description).toBeLessThanOrEqual(160);
      expect(page.title).toContain(city);
      expect(page.h1).toContain(city);
      expect(localBuyMetadata(page.path).alternates?.canonical).toBe(`https://phonespot.dk/${page.path}`);
    }
  });

  it("nævner aldrig den anden butiks adresse og lover ikke batteri på bærbare", () => {
    for (const page of LOCAL_BUY_PAGES) {
      const text = [page.title, page.description, ...localBuyFaqs(page).flatMap((faq) => [faq.question, faq.answer])].join(" ");
      if (page.store === "vejle") expect(text).not.toMatch(/Vestsjælland|Slagelse/);
      if (page.store === "slagelse") expect(text).not.toMatch(/Løversysselvej|Vejle/);
      if (page.kind === "laptop") expect(text).not.toMatch(/90 %|[Bb]atteri/);
      expect(text).not.toMatch(/samme dag|Panserglas|Foxway|Trustpilot/i);
    }
  });

  it("tæller kun enheder i butikkens egen by", () => {
    const t = template("a", [{ name: "Vejle", type: "store", count: 2 }, { name: "Vejle Gågade", type: "store", count: 4 }, { name: "Online", type: "online", count: 9 }]);
    expect(inStoreCount(t, STORES.vejle)).toBe(2);
    expect(inStoreCount(t, STORES.slagelse)).toBe(0);
  });

  it("viser butikkens enheder først og siger antallet", () => {
    const page = getLocalBuyPage("iphones-slagelse");
    const { container } = render(<LocalBuyPage page={page} templates={[
      template("iphone-13", [{ name: "Slagelse", type: "store", count: 2 }]),
      template("iphone-15", [{ name: "Online", type: "online", count: 5 }]),
    ]} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Brugte iPhones i Slagelse");
    expect(container.textContent).toContain("Lige nu ligger der 2 iPhones i butikken i VestsjællandsCentret");
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining(["/butik/slagelse", "/reparation-slagelse", "/saelg-din-enhed/slagelse", "/baerbare-slagelse", "/iphones"]));
    const types = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent!)["@type"]);
    expect(types).toEqual(expect.arrayContaining(["ElectronicsStore", "BreadcrumbList", "FAQPage", "ItemList"]));
  });

  it("lover ikke et udvalg i butikken, når der ikke ligger noget", () => {
    const page = getLocalBuyPage("iphones-vejle");
    const { container } = render(<LocalBuyPage page={page} templates={[template("iphone-15", [{ name: "Online", type: "online", count: 5 }])]} />);
    expect(container.textContent).toContain("Der ligger ingen iPhones fremme i butikken i dag");
    expect(container.textContent).not.toMatch(/Lige nu ligger der \d/);
  });
});

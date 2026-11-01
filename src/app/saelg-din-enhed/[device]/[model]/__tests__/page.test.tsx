import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Page, { generateMetadata, generateStaticParams } from "../page";
import { SELL_MODEL_PAGES } from "../models";

vi.mock("@/components/sell-device/sell-device-wizard", () => ({
  SellDeviceWizard: () => <div data-testid="sell-wizard" />,
}));
afterEach(cleanup);

const BANNED = [/foxway/i, /dropship/i, /panserglas/i, /certificerede teknikere/i, /30\+ tests/i, /esbjerg/i, /original kasse/i];
const params = (device: string, model: string) => ({ params: Promise.resolve({ device, model }) });

describe("Modelsider under /saelg-din-enhed/[device]/[model]", () => {
  it("dækker konsoller, defekte varianter og alle kategorier", () => {
    const paths = generateStaticParams().map(({ device, model }) => `${device}/${model}`);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of ["spillekonsol/playstation-5", "spillekonsol/defekt-playstation-5", "spillekonsol/defekt", "controller/defekt", "macbook/macbook-air-m2", "ipad/defekt", "laptop/defekt", "samsung/galaxy-s24", "dyson/airwrap", "hoeretelefoner/airpods-pro"]) {
      expect(paths).toContain(path);
    }
  });

  it("giver unik titel, beskrivelse og egen canonical", async () => {
    const titles = new Set<string>();
    for (const page of SELL_MODEL_PAGES) {
      const meta = await generateMetadata(params(page.device, page.slug));
      expect(String(meta.title), page.slug).toMatch(/^Sælg /);
      expect(String(meta.description).length, page.slug).toBeLessThanOrEqual(175);
      expect(meta.alternates?.canonical).toBe(`https://phonespot.dk/saelg-din-enhed/${page.device}/${page.slug}`);
      titles.add(String(meta.title));
    }
    expect(titles.size).toBe(SELL_MODEL_PAGES.length);
  });

  it("nævner defekt, viser ingen priser og ingen forbudte ord", async () => {
    for (const page of SELL_MODEL_PAGES) {
      const { container, unmount } = render(await Page(params(page.device, page.slug)));
      expect(container.querySelectorAll("h1"), page.slug).toHaveLength(1);
      const text = container.textContent ?? "";
      expect(text, page.slug).toMatch(/defekt/i);
      expect(text, page.slug).not.toMatch(/\d[\d.]*\s*(kr\b|kroner)/i);
      expect(text, page.slug).not.toMatch(/med det samme|samme dag|øjeblikkelig/i);
      for (const pattern of BANNED) expect(text).not.toMatch(pattern);
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      unmount();
    }
  });

  it("returnerer 404 for ukendt model", async () => {
    await expect(Page(params("spillekonsol", "gameboy"))).rejects.toThrow();
  });
});

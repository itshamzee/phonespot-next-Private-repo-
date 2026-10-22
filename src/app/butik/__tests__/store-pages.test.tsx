import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import StoreDetailPage, { generateMetadata } from "../[slug]/page";

// Review retrieval is an unrelated async server/network boundary.

afterEach(cleanup);

describe("store journeys", () => {
  it.each(["vejle", "slagelse"])("keeps every booking action in %s preselected", async (slug) => {
    render(await StoreDetailPage({ params: Promise.resolve({ slug }) }));
    const bookings = screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("/reparation/booking"));
    expect(bookings.length).toBeGreaterThan(0);
    for (const link of bookings) expect(link).toHaveAttribute("href", `/reparation/booking?store=${slug}`);
  });
  it("uses config-derived weekday and separate weekend opening hours in Vejle structured data", async () => {
    const { container } = render(await StoreDetailPage({ params: Promise.resolve({ slug: "vejle" }) }));
    const business = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent!)).find((s) => s["@type"] === "ElectronicsRepair");
    expect(business.openingHoursSpecification).toHaveLength(3);
    expect(business.openingHoursSpecification[0]).toMatchObject({ opens: "10:00", closes: "17:30" });
    expect(business.openingHoursSpecification[2]).toMatchObject({ dayOfWeek: ["Sunday"], closes: "15:00" });
  });
  it.each(["vejle", "slagelse"])("has an independent canonical for %s", async (slug) => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug }) });
    expect(metadata.alternates?.canonical).toBe(`https://phonespot.dk/butik/${slug}`);
  });
  describe("Esbjerg before opening", () => {
    it("announces the opening month and never links to booking for a store that is not open", async () => {
      const { container } = render(await StoreDetailPage({ params: Promise.resolve({ slug: "esbjerg" }) }));
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("PhoneSpot Esbjerg");
      expect(screen.getByText("Åbner november 2026")).toBeInTheDocument();
      const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href") ?? "");
      expect(hrefs.filter((href) => href.startsWith("/reparation/booking"))).toEqual([]);
      expect(hrefs).toContain("/reparation/indsend");
      const business = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent!)).find((s) => s["@type"] === "ElectronicsRepair");
      expect(business.address).toMatchObject({ streetAddress: "Gl. Vardevej 230", postalCode: "6715" });
      expect(business.openingHoursSpecification).toBeUndefined();
    });
    it("has its own canonical and opening-month title", async () => {
      const metadata = await generateMetadata({ params: Promise.resolve({ slug: "esbjerg" }) });
      expect(metadata.alternates?.canonical).toBe("https://phonespot.dk/butik/esbjerg");
      expect(String(metadata.title)).toContain("november 2026");
    });
  });
});

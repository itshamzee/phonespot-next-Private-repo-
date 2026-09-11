import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import StoreDetailPage, { generateMetadata } from "../[slug]/page";

// Review retrieval is an unrelated async server/network boundary.
vi.mock("@/components/trustpilot/trustpilot-reviews", () => ({ TrustpilotReviews: () => null }));

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
});

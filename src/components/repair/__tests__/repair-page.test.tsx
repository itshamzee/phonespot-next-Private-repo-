import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReparationPage, { metadata } from "@/app/reparation/page";

vi.mock("@/lib/supabase/repairs", () => ({
  getActiveBrands: async () => [{ id: "iphone", name: "iPhone", slug: "iphone", device_type: "smartphone" }],
  getAllModelsWithBrand: async () => [{ id: "15", name: "iPhone 15", slug: "iphone-15", brand_slug: "iphone", brand_name: "iPhone" }],
}));

describe("Reparationssiden", () => {
  it("bevarer søgning og sender kunden til den valgte models reparationer", async () => {
    render(await ReparationPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Reparation.");
    expect(screen.getByRole("link", { name: "Find model og pris" })).toHaveAttribute("href", "#find-din-pris");
    fireEvent.change(screen.getByRole("textbox", { name: "Søg efter model" }), { target: { value: "iPhone 15" } });
    expect(screen.getByRole("link", { name: /iPhone 15 iPhone/ })).toHaveAttribute("href", "/reparation/iphone/iphone-15");
  });
  it("bevarer canonical, FAQ og brødkrummer samt beskrivelser af reparationerne", async () => {
    const { container } = render(await ReparationPage());
    expect(metadata.alternates?.canonical).toBe("https://phonespot.dk/reparation");
    for (const name of ["Skærmskift", "Batteriskift", "Ladestik, kamera og lyd", "Væskeskade eller ukendt fejl", "iPhone og Samsung", "iPad og MacBook"]) {
      expect(screen.getByRole("heading", { name })).toBeVisible();
    }
    const schemas = [...container.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent!));
    const faq = schemas.find(s => s["@type"] === "FAQPage");
    const details = [...container.querySelectorAll("details")];
    expect(faq.mainEntity).toHaveLength(7);
    expect(details).toHaveLength(7);
    faq.mainEntity.forEach((q: { name: string; acceptedAnswer: { text: string } }, index: number) => {
      expect(details[index].querySelector("summary")).toHaveTextContent(q.name);
      expect(details[index].querySelector("p")).toHaveTextContent(q.acceptedAnswer.text);
    });
    expect(schemas.find(s => s["@type"] === "BreadcrumbList").itemListElement[1].item).toBe("https://phonespot.dk/reparation");
    expect(schemas.find(s => s["@type"] === "LocalBusiness").openingHoursSpecification.some((h: { dayOfWeek: string[] }) => h.dayOfWeek.includes("Sunday"))).toBe(true);
    expect(screen.getByRole("link", { name: /Vejle.*Løversysselvej/ })).toHaveAttribute("href", "/butik/vejle");
    expect(screen.getByRole("link", { name: /Slagelse.*VestsjællandsCentret/ })).toHaveAttribute("href", "/butik/slagelse");
    expect(screen.getByRole("link", { name: "Se elektronikforsikring" })).toHaveAttribute("href", "/forsikring");
  });
  it("henter først filmen ved kundens valg og giver almindelige afspilningskontroller", async () => {
    const { container } = render(await ReparationPage());
    expect(container.querySelector("video")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Afspil: Dit reparationsforløb/ }));
    const video = screen.getByLabelText("Sådan foregår en reparation hos PhoneSpot");
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("playsinline");
    expect(video).not.toHaveAttribute("loop");
    expect(video.querySelector("source")).toHaveAttribute("src", "/videos/reparation.mp4");
  });
});


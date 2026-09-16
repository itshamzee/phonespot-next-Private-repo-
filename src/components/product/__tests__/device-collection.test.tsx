import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeviceCollection, DeviceCollectionDetails } from "../device-collection";

describe("DeviceCollection", () => {
  it("links to the real store routes and gives the FAQ its own heading", () => {
    render(
      <DeviceCollection
        templates={[]}
        title="Refurbished enheder"
        intro="Aktuelt udvalg."
        collectionHeading="Aktuelle modeller"
        guideTitle="Sådan vælger du"
        faqTitle="Spørgsmål om enheder"
        guideIntro="Sammenlign modellerne."
        choices={[]}
        faqs={[]}
      />,
    );

    expect(screen.getByRole("link", { name: /PhoneSpot Vejle/ })).toHaveAttribute("href", "/butik/vejle");
    expect(screen.getByRole("link", { name: /PhoneSpot Slagelse/ })).toHaveAttribute("href", "/butik/slagelse");
    expect(screen.getByRole("heading", { name: "Spørgsmål om enheder" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sådan vælger du" })).toBeInTheDocument();
  });

  it("provides the shared condition, guidance, store and FAQ rhythm for tier pages", () => {
    render(
      <DeviceCollectionDetails
        guideTitle="Vælg en bærbar i dette prisniveau"
        guideIntro="Sammenlign behov og specifikationer."
        choices={[{ title: "Ydelse", body: "Se processor og RAM." }]}
        faqTitle="Spørgsmål om prisniveauet"
        faqs={[{ question: "Hvordan vælger jeg?", answer: "Start med dine programmer." }]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Hvad betyder standen?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vælg en bærbar i dette prisniveau" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /PhoneSpot Vejle/ })).toHaveAttribute("href", "/butik/vejle");
    expect(screen.getByRole("heading", { name: "Spørgsmål om prisniveauet" })).toBeInTheDocument();
    expect(screen.getByText("Hvordan vælger jeg?")).toBeInTheDocument();
  });
});

it.each(["laptop", "ipad", "watch"] as const)("uses %s condition examples even when the collection is empty", (deviceType) => {
 render(<DeviceCollection templates={[]} deviceType={deviceType} title="Enheder" intro="Udvalg" collectionHeading="Modeller" guideTitle="Guide" guideIntro="Hjælp" choices={[]} faqs={[]} />);
 const images = screen.getAllByRole("img");
 expect(images.some((image) => image.getAttribute("src")?.includes(deviceType + "-grade-a-frame.png"))).toBe(true);
});

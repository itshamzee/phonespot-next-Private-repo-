import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeviceCollection } from "../device-collection";

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
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SellPage, { metadata } from "@/app/saelg-din-enhed/page";

vi.mock("../sell-device-wizard", () => ({
  SellDeviceWizard: () => <div data-testid="sell-wizard" />,
}));
afterEach(cleanup);

describe("Salgssidens søgbare indhold", () => {
  it("bevarer vurderingsflow, egen canonical og enhedernes indhold i siden", () => {
    render(<SellPage />);
    expect(metadata.alternates?.canonical).toBe("https://phonespot.dk/saelg-din-enhed");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Sælg din brugte elektronik/);
    for (const model of [/brugte iPhone/, /Samsung Galaxy/, /iPad eller tablet/, /MacBook eller laptop/, /smartwatch/]) {
      expect(screen.getByRole("heading", { name: model })).toBeTruthy();
    }
    expect(screen.getByTestId("sell-wizard")).toBeTruthy();
    expect(document.querySelector('#start')).toBeTruthy();
  });

  it("udgiver brødkrummer og kun FAQ-svar, som også findes på siden", () => {
    const { container } = render(<SellPage />);
    const schemas = Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
      .map(script => JSON.parse(script.textContent ?? "{}"));
    const breadcrumb = schemas.find(schema => schema["@type"] === "BreadcrumbList");
    expect(breadcrumb.itemListElement.at(-1).item).toBe(metadata.alternates?.canonical);
    const faq = schemas.find(schema => schema["@type"] === "FAQPage");
    const visibleQuestions = Array.from(container.querySelectorAll("details"));
    expect(faq.mainEntity).toHaveLength(visibleQuestions.length);
    for (const question of faq.mainEntity) {
      const matching = visibleQuestions.find(detail => detail.querySelector("summary")?.textContent?.includes(question.name));
      expect(matching?.querySelector("p")?.textContent).toBe(question.acceptedAnswer.text);
    }
  });
});

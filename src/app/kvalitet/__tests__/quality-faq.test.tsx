import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import QualityPage from "../page";
afterEach(cleanup);
it("publishes the same FAQ answers that a visitor can read", () => {
  const { container } = render(<QualityPage />);
  const schema = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent!)).find((s) => s["@type"] === "FAQPage");
  expect(schema.mainEntity.length).toBeGreaterThan(0);
  for (const item of schema.mainEntity) {
    const question = screen.getByRole("button", { name: item.name });
    fireEvent.click(question);
    const regionId = question.getAttribute("aria-controls");
    expect(regionId).toBeTruthy();
    const answer = document.getElementById(regionId!);
    expect(answer).toBeVisible();
    expect(answer).toHaveTextContent(item.acceptedAnswer.text);
  }
});

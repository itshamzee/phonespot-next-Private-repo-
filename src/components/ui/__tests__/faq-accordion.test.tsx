import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FaqAccordion } from "../faq-accordion";
afterEach(cleanup);
it("links distinct questions and answer regions across accordion instances", () => {
  render(<><FaqAccordion items={[{ question: "Første spørgsmål", answer: "Første svar" }]} /><FaqAccordion items={[{ question: "Andet spørgsmål", answer: "Andet svar" }]} /></>);
  const buttons = screen.getAllByRole("button");
  expect(buttons[0].getAttribute("aria-controls")).not.toBe(buttons[1].getAttribute("aria-controls"));
  for (const button of buttons) {
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    const region = screen.getByRole("region", { name: button.textContent! });
    expect(region.id).toBe(button.getAttribute("aria-controls"));
    expect(region).toHaveAttribute("aria-labelledby", button.id);
    expect(button).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(button);
    expect(region).not.toBeVisible();
  }
});
it("closes the previous answer when another question opens", () => {
  render(<FaqAccordion items={[{ question: "A", answer: "Svar A" }, { question: "B", answer: "Svar B" }]} />);
  fireEvent.click(screen.getByRole("button", { name: "A" }));
  fireEvent.click(screen.getByRole("button", { name: "B" }));
  expect(screen.getByRole("button", { name: "A" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("button", { name: "B" })).toHaveAttribute("aria-expanded", "true");
});

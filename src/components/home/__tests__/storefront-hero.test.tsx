import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StorefrontHero } from "../storefront-hero";

describe("StorefrontHero", () => {
  it("keeps the heading, image and destination together when advancing and wrapping", () => {
    render(<StorefrontHero />);
    expect(screen.getByRole("link", { name: "Se vores iPhones" })).toHaveAttribute("href", "/iphones");
    fireEvent.click(screen.getByRole("button", { name: "Næste kategori" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Til alt det,du skal nå.");
    expect(screen.getByRole("img", { name: "MacBook fotograferet i et studie" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Se vores bærbare" })).toHaveAttribute("href", "/baerbare");
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Næste kategori" }));
    expect(screen.getByRole("img", { name: "iPhone 17 Pro i sølv, kosmisk orange og dyb blå" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Forrige kategori" }));
    expect(screen.getByRole("link", { name: "Se vores smartwatches" })).toHaveAttribute("href", "/smartwatches");
  });

  it("moves selection and focus with arrow keys and keeps services persistent", () => {
    render(<StorefrontHero />);
    fireEvent.keyDown(screen.getByRole("button", { name: "iPhones" }), { key: "ArrowLeft" });
    expect(screen.getByRole("button", { name: "Smartwatches" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Smartwatches" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "Se vores smartwatches" })).toHaveAttribute("href", "/smartwatches");
    fireEvent.click(screen.getByRole("button", { name: "iPads" }));
    expect(screen.getByRole("link", { name: "Se vores iPads" })).toHaveAttribute("href", "/ipads");
    expect(screen.getByRole("link", { name: "Find din reparation" })).toHaveAttribute("href", "/reparation");
    expect(screen.getByRole("link", { name: "Hvad er din enhed værd?" })).toHaveAttribute("href", "/saelg-din-enhed");
  });
});

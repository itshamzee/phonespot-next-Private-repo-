import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "../footer";

describe("Footer", () => {
  it("states the device guarantee and the Danish Trustpilot rating", () => {
    render(<Footer />);
    expect(screen.getByText(/Alle refurbished enheder leveres med 36 måneders garanti/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /Trustpilot — 4,7 stjerner/ })).toHaveAttribute("href", "https://dk.trustpilot.com/review/phonespot.dk");
  });
  it("links to selling an existing device from the footer", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "Sælg din enhed" })).toHaveAttribute("href", "/saelg-din-enhed");
  });
  it("preserves cookie settings and the insurance partner", () => {
    render(<Footer />);
    expect(screen.getByRole("button", { name: /cookie/i })).toBeVisible();
    expect(screen.getByRole("link", { name: "Elektronikforsikring i samarbejde med Storstrøm Forsikring" })).toHaveAttribute("href", "/forsikring");
  });
});

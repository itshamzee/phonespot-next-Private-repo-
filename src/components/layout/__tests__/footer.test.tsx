import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "../footer";

describe("Footer", () => {
  it("states the device guarantee and the Danish Trustpilot rating", () => {
    render(<Footer />);
    expect(screen.getByText(/Alle refurbished enheder leveres med 36 måneders garanti/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /Trustpilot — 4,7 stjerner/ })).toHaveAttribute("href", "https://dk.trustpilot.com/review/phonespot.dk");
  });
  it("preserves newsletter submission, cookie settings and insurance partner", () => {
    render(<Footer />);
    const email = screen.getByRole("textbox", { name: "Din e-mailadresse" });
    expect(email).toHaveAttribute("name", "email");
    expect(email).toBeRequired();
    expect(email.closest("form")).toHaveAttribute("action", "/api/newsletter");
    expect(email.closest("form")).toHaveAttribute("method", "POST");
    expect(screen.getByRole("button", { name: /cookie/i })).toBeVisible();
    expect(screen.getByRole("link", { name: "Elektronikforsikring i samarbejde med Storstrøm Forsikring" })).toHaveAttribute("href", "/forsikring");
  });
});

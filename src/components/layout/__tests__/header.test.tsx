import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
const { openCart, push } = vi.hoisted(() => ({ openCart: vi.fn(), push: vi.fn() }));
vi.mock("@/components/cart/cart-context", () => ({ useCart: () => ({ totals: { itemCount: 2 }, openCart }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
import { Header } from "../header";

describe("Header", () => {
  it("offers a direct call to the store from the top bar", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: "Ring til PhoneSpot på 61 10 00 48" })).toHaveAttribute("href", "tel:+4561100048");
  });
  it("links its logo, categories and services to existing destinations", () => {
    render(<Header />);
    expect(screen.getByAltText("PhoneSpot").closest("a")).toHaveAttribute("href", "/");
    const nav = screen.getByRole("navigation", { name: "Kategorier" });
    expect(within(nav).getByRole("link", { name: "iPhones" })).toHaveAttribute("href", "/iphones");
    expect(within(nav).getByRole("link", { name: "Smartphones" })).toHaveAttribute("href", "/smartphones");
    expect(within(nav).getByRole("link", { name: "Bærbare" })).toHaveAttribute("href", "/baerbare");
    expect(within(nav).getByRole("link", { name: "Reparation" })).toHaveAttribute("href", "/reparation");
    expect(screen.getByRole("link", { name: "Min konto" })).toHaveAttribute("href", "/konto");
    expect(screen.getByRole("link", { name: "Find butik" })).toHaveAttribute("href", "/butik");
  });
  it("keeps purchase, repair and sell links outside the mobile menu", () => {
    render(<Header />);
    const nav = screen.getByRole("navigation", { name: "Køb, reparer eller sælg" });
    expect(within(nav).getByRole("link", { name: "Køb" })).toHaveAttribute("href", "/#udvalg");
    expect(within(nav).getByRole("link", { name: "Reparation" })).toHaveAttribute("href", "/reparation");
    expect(within(nav).getByRole("link", { name: "Sælg din enhed" })).toHaveAttribute("href", "/saelg-din-enhed");
  });
  it("opens the real cart and exposes its item count", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: "Åbn kurv, 2 varer" }));
    expect(openCart).toHaveBeenCalledOnce();
  });
  it("submits a trimmed, encoded search to the existing search route", () => {
    render(<Header />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Søg efter model eller tilbehør" }), { target: { value: "  iPhone 17  " } });
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/soeg?q=iPhone%2017");
  });
  it("opens a named mobile dialog, traps focus and restores the menu button on Escape", () => {
    render(<Header />);
    const toggle = screen.getByRole("button", { name: "Åbn menu" });
    fireEvent.click(toggle);
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    expect(within(dialog).getAllByRole("link", { name: "Smartphones" })).toHaveLength(1);
    const close = within(dialog).getByRole("button", { name: "Luk menu" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(within(dialog).getByRole("link", { name: "Kontakt" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
  it("closes the mobile menu when a destination is selected", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: "Åbn menu" }));
    const destination = within(screen.getByRole("dialog")).getByRole("link", { name: "Beskyttelsesglas" });
    destination.addEventListener("click", event => event.preventDefault());
    fireEvent.click(destination);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("scopes the guarantee to devices and uses the approved Danish rating", () => {
    render(<Header />);
    expect(screen.getByText("36 måneders garanti på enheder")).toBeVisible();
    expect(screen.getByRole("link", { name: "Trustpilot 4,7 / 5" })).toHaveAttribute("href", "https://dk.trustpilot.com/review/phonespot.dk");
  });
});

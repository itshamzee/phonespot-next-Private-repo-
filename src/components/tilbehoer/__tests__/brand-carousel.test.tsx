import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandCarousel } from "../brand-carousel";

describe("BrandCarousel", () => {
  it("lets customers choose an exact model before opening matching accessories", () => {
    render(<BrandCarousel />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Vælg Samsung" }));
    const models = screen.getByRole("combobox", { name: "Vælg din Samsung-model" });
    expect(within(models).queryByRole("option", { name: "iPhone 17 Pro" })).not.toBeInTheDocument();
    fireEvent.change(models, { target: { value: "samsung-s25" } });
    expect(screen.getByRole("link", { name: "Se tilbehør til Galaxy S25" })).toHaveAttribute("href", "/tilbehoer?model=Galaxy%20S25#tilbehoersudvalg");
  });

  it("clears the previous model when the customer changes brand", () => {
    render(<BrandCarousel />);
    fireEvent.click(screen.getByRole("button", { name: "Vælg Samsung" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "samsung-s25" } });
    fireEvent.click(screen.getByRole("button", { name: "Vælg Apple" }));
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(screen.queryByRole("link", { name: /Se tilbehør til/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vælg Apple" })).toHaveAttribute("aria-pressed", "true");
  });
});

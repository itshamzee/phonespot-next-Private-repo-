import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SellDeviceWizard } from "../sell-device-wizard";

afterEach(cleanup);

describe("SellDeviceWizard initialDevice", () => {
  it("forvælger enhedstype og mærke, når prop er sat", () => {
    render(<SellDeviceWizard initialDevice={{ deviceType: "Laptop", brand: "Apple" }} />);
    expect(screen.getByRole("button", { name: /Laptop/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Telefon/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("starter uden forvalg, når prop mangler", () => {
    render(<SellDeviceWizard />);
    for (const name of [/Telefon/, /Tablet/, /Laptop/, /Smartwatch/]) {
      expect(screen.getByRole("button", { name }).getAttribute("aria-pressed")).toBe("false");
    }
  });
});

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuidePricePanel } from "../guide-price-panel";

const device = { deviceType: "Telefon", brand: "Apple", model: "iPhone 13", storage: "128GB", useCustom: false };
const condition = { screen: "Perfekt", back: "Perfekt", battery: "God (80%+)", allWorking: "Ja", brokenParts: [], cloudLocked: "Nej" };
const respond = (body: unknown, ok = true) => vi.mocked(fetch).mockResolvedValue({ ok, json: async () => body } as Response);

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GuidePricePanel", () => {
  it("viser prisen og forbeholdet, når serveren giver en pris", async () => {
    respond({ priced: true, amountDkk: 1200 });
    render(<GuidePricePanel device={device} condition={condition} ready />);
    expect(await screen.findByText("1.200 kr.")).toBeInTheDocument();
    expect(screen.getByText(/Den endelige pris får du, når vi har tjekket/)).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/trade-in/guide-price");
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ device, condition });
  });

  it("viser ingenting, når serveren ikke giver en pris eller fejler", async () => {
    respond({ priced: false });
    const { container, rerender } = render(<GuidePricePanel device={device} condition={condition} ready />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(container).toBeEmptyDOMElement();

    vi.mocked(fetch).mockRejectedValue(new Error("net"));
    rerender(<GuidePricePanel device={{ ...device, storage: "256GB" }} condition={condition} ready />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(container).toBeEmptyDOMElement();
  });

  it("spørger ikke for andre enheder end iPhone, eller før standen er udfyldt", async () => {
    respond({ priced: true, amountDkk: 1200 });
    const { rerender } = render(<GuidePricePanel device={device} condition={condition} ready={false} />);
    rerender(<GuidePricePanel device={{ ...device, brand: "Samsung", model: "Galaxy S24" }} condition={condition} ready />);
    rerender(<GuidePricePanel device={{ ...device, useCustom: true }} condition={condition} ready />);
    rerender(<GuidePricePanel device={{ ...device, storage: "" }} condition={condition} ready />);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("skjuler en gammel pris, så snart standen ændres", async () => {
    respond({ priced: true, amountDkk: 1200 });
    const { rerender } = render(<GuidePricePanel device={device} condition={condition} ready />);
    expect(await screen.findByText("1.200 kr.")).toBeInTheDocument();
    respond({ priced: true, amountDkk: 500 });
    rerender(<GuidePricePanel device={device} condition={{ ...condition, screen: "Revnet" }} ready />);
    expect(screen.queryByText("1.200 kr.")).not.toBeInTheDocument();
    expect(await screen.findByText("500 kr.")).toBeInTheDocument();
  });
});

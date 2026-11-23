import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuidePricePanel, GuidePriceTeaser } from "../guide-price-panel";

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
    respond({ priced: true, amountDkk: 1200, topDkk: 1200 });
    render(<GuidePricePanel device={device} condition={condition} ready />);
    expect(await screen.findByText("1.200 kr.")).toBeInTheDocument();
    expect(screen.getByText(/Prisen holder, når enheden svarer til din beskrivelse/)).toBeInTheDocument();
    expect(screen.queryByText(/trækker/)).not.toBeInTheDocument();
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

  it("viser, hvad standen koster, når prisen er lavere end fin stand", async () => {
    respond({ priced: true, amountDkk: 1050, topDkk: 1200 });
    render(<GuidePricePanel device={device} condition={{ ...condition, back: "Små ridser" }} ready />);
    expect(await screen.findByText("1.050 kr.")).toBeInTheDocument();
    expect(screen.getByText("I fin stand uden fejl: 1.200 kr. Standen, du har beskrevet, trækker 150 kr. fra.")).toBeInTheDocument();
  });

  it("spørger ikke uden model, for fritekst-modeller, eller før standen er udfyldt", async () => {
    respond({ priced: true, amountDkk: 1200 });
    const { rerender } = render(<GuidePricePanel device={device} condition={condition} ready={false} />);
    rerender(<GuidePricePanel device={{ ...device, useCustom: true }} condition={condition} ready />);
    rerender(<GuidePricePanel device={{ ...device, model: "" }} condition={condition} ready />);
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

  it("teaseren viser op til-prisen for fin stand, men først når lagerplads er valgt", async () => {
    respond({ priced: true, amountDkk: 650, topDkk: 650 });
    const phone = { ...device, model: "iPhone 11", storage: "" };
    const { rerender } = render(<GuidePriceTeaser device={phone} />);
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(fetch).not.toHaveBeenCalled();
    rerender(<GuidePriceTeaser device={{ ...phone, storage: "64GB" }} />);
    expect(await screen.findByText("650 kr.")).toBeInTheDocument();
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).condition).toEqual(condition);
  });
});

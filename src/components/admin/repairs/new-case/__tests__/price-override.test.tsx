import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { RepairServiceCategory, RepairServiceOption } from "@/lib/repairs/new-case-types";
import { INITIAL_CHECKLIST } from "@/lib/repairs/intake-checklist";
import { EMPTY_CUSTOMER, buildPanelLines, buildRequest, totalOere } from "../logic";
import { buildGroupRequest, deriveDevice, newDraft, removeLineFrom, setLineOverride, type DeviceDraft } from "../devices";
import { SummaryPanel } from "../summary-panel";

afterEach(cleanup);

function svc(over: Partial<RepairServiceOption> & { id: string; price_dkk: number }): RepairServiceOption {
  return {
    slug: over.id,
    name: "Skærmskift",
    price_oere: over.price_dkk * 100,
    quality_tier: "premium",
    quality_label: null,
    estimated_minutes: 30,
    warranty_info: null,
    part_mode: "part",
    part: null,
    ...over,
  };
}

const screen14: RepairServiceCategory = { name: "Skærmskift", recommended_service_id: null, services: [svc({ id: "oem", price_dkk: 1199 })] };
const addon = { key: "p:x", kind: "product" as const, sku_product_id: "x", title: "Glas", price_oere: 9900, qty: 2 };

const base = {
  customerType: "privat" as const,
  existing: null,
  draft: { ...EMPTY_CUSTOMER, name: "Kunde", phone: "20 45 12 34" },
  storeId: null,
  model: { id: "m", name: "iPhone 14 Plus", brandName: "iPhone" },
  device: { serial: "1", color: "", passcode: "" },
  categories: [screen14],
  selected: { Skærmskift: "oem" },
  free: [],
  checklist: INITIAL_CHECKLIST,
  photos: [],
  notes: "",
  promisedAt: "2026-10-15T16:00",
  assignedTo: "M",
  sendSms: false,
};

describe("price overrides in the new-case logic", () => {
  it("uses the staff price in the panel line and total, and keeps the list price", () => {
    const lines = buildPanelLines({
      categories: [screen14], selected: { Skærmskift: "oem" }, free: [], addons: [addon], location: "vejle",
      overrides: { "svc:oem": { unit_oere: 99_900, reason: "Aftalt pris med kunden" }, "addon:p:x": { unit_oere: 5_000, reason: "Kulance" } },
    });
    expect(lines[0]).toMatchObject({ amount_oere: 99_900, list_unit_oere: 119_900, override: { reason: "Aftalt pris med kunden" } });
    expect(lines[1]).toMatchObject({ amount_oere: 10_000, qty: 2, list_unit_oere: 9_900 });
    expect(totalOere(lines)).toBe(109_900);
  });

  it("sends unit_price_oere + price_reason only when the price differs from the list price", () => {
    const req = buildRequest({
      ...base,
      addons: [addon],
      overrides: { "svc:oem": { unit_oere: 99_900, reason: "Aftalt pris med kunden" }, "addon:p:x": { unit_oere: 9_900, reason: "ligegyldig" } },
    });
    expect(req.items).toEqual([
      { kind: "repair", repair_service_id: "oem", unit_price_oere: 99_900, price_reason: "Aftalt pris med kunden" },
      { kind: "product", sku_product_id: "x", qty: 2 },
    ]);
  });

  it("ignores an override left behind for a service that is no longer selected", () => {
    const req = buildRequest({ ...base, selected: {}, addons: [], overrides: { "svc:oem": { unit_oere: 1, reason: "x" } } });
    expect(req.items).toEqual([]);
  });

  it("removing a line also drops its override", () => {
    const d = { ...newDraft("k"), selected: { Skærmskift: "oem" }, overrides: { "svc:oem": { unit_oere: 1, reason: "x" } } };
    const [line] = buildPanelLines({ categories: [screen14], selected: d.selected, free: [], addons: [], location: "vejle" });
    expect(removeLineFrom(d, [screen14], line).overrides).toEqual({});
    expect(setLineOverride(d, "svc:oem", null).overrides).toEqual({});
  });

  it("group intake: each device carries its own override", () => {
    const mk = (key: string, price: number | null) => {
      const draft: DeviceDraft = {
        ...newDraft(key),
        model: { id: "m", name: "iPhone 14 Plus", brandName: "iPhone" } as never,
        selected: { Skærmskift: "oem" },
        overrides: price == null ? ({} as Record<string, never>) : { "svc:oem": { unit_oere: price, reason: "Aftalt" } },
        svc: { key: "m|vejle", data: { categories: [screen14] } as never, error: "" },
      };
      return { draft, view: deriveDevice(draft, "vejle", "vejle", new Date("2026-10-15T09:00:00"), "M") };
    };
    const devices = [mk("a", 99_900), mk("b", null)];
    expect(devices[0].view.total_oere).toBe(99_900);
    expect(devices[1].view.total_oere).toBe(119_900);
    const req = buildGroupRequest({ customerType: "privat", existing: null, draft: base.draft, storeId: null, sendSms: false }, devices);
    expect(req.devices[0].items[0]).toMatchObject({ unit_price_oere: 99_900, price_reason: "Aftalt" });
    expect(req.devices[1].items[0]).toEqual({ kind: "repair", repair_service_id: "oem" });
  });
});

describe("SummaryPanel price editing", () => {
  function renderPanel(onPriceLine = vi.fn()) {
    const lines = buildPanelLines({ categories: [screen14], selected: { Skærmskift: "oem" }, free: [], addons: [], location: "vejle" });
    render(
      <SummaryPanel
        customerName="Kunde" customerSub="Privat"
        devices={[{ key: "a", name: "iPhone 14 Plus", sub: "1", lines, total_oere: totalOere(lines), depositHint: false }]}
        total_oere={totalOere(lines)}
        onRemoveLine={vi.fn()} onPriceLine={onPriceLine}
        sendSms={false} onSendSms={vi.fn()} print={false} onPrint={vi.fn()}
        pickStore={false} location="vejle" onLocation={vi.fn()}
        missing={[]} submitting={false} error="" canSubmit onSubmit={vi.fn()}
      />,
    );
    return { onPriceLine, lines };
  }

  it("lets staff click the price, set 999 kr. with a reason and passes the override up", () => {
    const { onPriceLine, lines } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Ret pris: Skærmskift (OEM)" }));
    expect(screen.getByText(/Listepris 1\.199 kr\./)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ny pris (kr.)"), { target: { value: "999" } });
    fireEvent.click(screen.getByRole("button", { name: "Brug prisen" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Skriv en begrundelse");
    expect(onPriceLine).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Aftalt pris med kunden" }));
    fireEvent.click(screen.getByRole("button", { name: "Brug prisen" }));
    expect(onPriceLine).toHaveBeenCalledWith("a", lines[0], { unit_oere: 99_900, reason: "Aftalt pris med kunden" });
  });

  it("clears the override when the list price is typed again", () => {
    const { onPriceLine, lines } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Ret pris: Skærmskift (OEM)" }));
    fireEvent.change(screen.getByLabelText("Ny pris (kr.)"), { target: { value: "1199" } });
    fireEvent.click(screen.getByRole("button", { name: "Brug prisen" }));
    expect(onPriceLine).toHaveBeenCalledWith("a", lines[0], null);
  });
});

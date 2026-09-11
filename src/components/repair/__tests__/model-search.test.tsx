import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandPicker } from "@/app/reparation/brand-picker";
import { ModelGrid } from "@/app/reparation/[brand]/model-grid";
import type { RepairBrand, RepairModel } from "@/lib/supabase/types";
const brands: RepairBrand[] = [
  { id: "iphone", name: "iPhone", slug: "iphone", device_type: "smartphone", logo_url: null, sort_order: 0, active: true, created_at: "" },
  { id: "ipad", name: "iPad", slug: "ipad", device_type: "tablet", logo_url: null, sort_order: 1, active: true, created_at: "" },
];
const models: (RepairModel & { brand_slug: string; brand_name: string })[] = [
  { id: "15", brand_id: "iphone", name: "iPhone 15", slug: "iphone-15", series: "15", image_url: null, sort_order: 0, active: true, created_at: "", brand_slug: "iphone", brand_name: "iPhone" },
  { id: "15pro", brand_id: "iphone", name: "iPhone 15 Pro", slug: "iphone-15-pro", series: "15", image_url: null, sort_order: 1, active: true, created_at: "", brand_slug: "iphone", brand_name: "iPhone" },
];
describe("repair model search", () => {
  it("opens matching routes with keyboard, navigates results and closes with Escape", () => {
    render(<BrandPicker brands={brands} models={models} basePath="/reservedele" />);
    const search = screen.getByRole("textbox", { name: "Søg efter model" });
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: "iPhone 15" } });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    const first = screen.getByRole("link", { name: /iPhone 15 iPhone$/ });
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute("href", "/reservedele/iphone/iphone-15");
    fireEvent.keyDown(first, { key: "ArrowDown" });
    const second = screen.getByRole("link", { name: /iPhone 15 Pro iPhone/ });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second, { key: "Escape" });
    expect(search).toHaveFocus();
    expect(screen.queryByRole("navigation", { name: "Søgeresultater" })).not.toBeInTheDocument();
    expect(search).toHaveValue("iPhone 15");
  });
  it("offers help for missing matches and can clear a search", () => {
    render(<BrandPicker brands={brands} models={models} />);
    const search = screen.getByRole("textbox", { name: "Søg efter model" });
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: "unknown" } });
    expect(screen.getByRole("link", { name: /Få hjælp/ })).toHaveAttribute("href", "/kontakt");
    fireEvent.click(screen.getByRole("button", { name: "Ryd søgning" }));
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
  });
  it("keeps grouped brand destinations and returns to the brand list", () => {
    render(<BrandPicker brands={brands} models={models} basePath="/reservedele" />);
    fireEvent.click(screen.getByRole("button", { name: "Apple" }));
    expect(screen.getByRole("link", { name: /iPad/ })).toHaveAttribute("href", "/reservedele/ipad");
    fireEvent.click(screen.getByRole("button", { name: "Alle mærker" }));
    expect(screen.getByRole("button", { name: "Apple" })).toHaveFocus();
  });
  it("provides a labelled model filter, reset and help when models are missing", () => {
    render(<ModelGrid brandName="iPhone" models={[]} />);
    expect(screen.getByRole("textbox", { name: "Søg efter model" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Få hjælp/ })).toHaveAttribute("href", "/kontakt");
  });
  it("filters models without treating an unavailable zero price as free", () => {
    render(<ModelGrid brandName="iPhone" models={models.map((m) => ({ slug: m.slug, name: m.name, series: m.series, imageUrl: null, cheapestPrice: 0, brandSlug: "iphone", deviceType: "smartphone" }))} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Søg efter model" }), { target: { value: "Pro" } });
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/reparation/iphone/iphone-15-pro");
    expect(screen.queryByText(/0 kr/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ryd søgning" }));
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});

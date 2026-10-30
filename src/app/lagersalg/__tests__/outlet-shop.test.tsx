import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OutletShop } from "../outlet-shop";
import type { OutletItem } from "../outlet-filter";

vi.mock("../outlet-card", () => ({ OutletCard: ({ item }: { item: OutletItem }) => <span>{item.name}</span> }));

const base: Omit<OutletItem, "id" | "name" | "kind" | "priceOre" | "models"> = {
  slug: null,
  category: "covers",
  brand: null,
  imageUrl: null,
  stock: 1,
  orderable: false,
  laptopSize: null,
  bagType: null,
  color: null,
  type: "Cover",
  listPriceKr: null,
  createdAt: "2026-10-28T10:00:00Z",
};
const iphone15 = [{ slug: "iphone-15", label: "iPhone 15", brand: "apple" }];
const items: OutletItem[] = [
  { ...base, id: "c1", name: "Cover et", kind: "cover", priceOre: 7900, models: iphone15 },
  { ...base, id: "c2", name: "Cover to", kind: "cover", priceOre: 9900, models: iphone15 },
  { ...base, id: "o1", name: "Oplader", kind: "other", type: "Oplader", priceOre: 2900, models: iphone15 },
  { ...base, id: "x", name: "Cover S22", kind: "cover", priceOre: 5900, models: [{ slug: "samsung-s22", label: "Galaxy S22", brand: "samsung" }] },
];

describe("OutletShop med én model", () => {
  it("tæller kun modellens covers i overskrift og hero", () => {
    render(<OutletShop items={items} initialModel="iphone-15" />);
    expect(screen.getByRole("heading", { level: 2, name: /2 covers til iPhone 15/ })).toBeInTheDocument();
    expect(screen.getByText("2 covers i udvalget")).toBeInTheDocument();
    expect(screen.getByText(/fra 79 kr\./)).toBeInTheDocument();
    expect(screen.queryByText("Oplader")).toBeNull();
  });
});

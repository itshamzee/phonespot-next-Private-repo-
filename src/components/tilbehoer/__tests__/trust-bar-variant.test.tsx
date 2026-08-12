import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Both the tilbehør category listing and the tilbehør hub only ever list
// sku_products (accessories) — never graded refurbished devices. TrustBar
// defaults to variant="device" (36 mdr. garanti / 30+ kvalitetstests) when
// no variant is passed, which is a false claim about what's on these pages.
// This test mocks the heavy children (TilbehoerLayout uses next/navigation
// + client-side data fetching; CategoryFaq/KlarnaMicroBanner are unrelated
// to this concern) so it can render fast and assert directly on the variant
// TrustBar receives — the same way __tests__/route.test.ts under
// api/shipping/tracking asserts on props passed to a mocked template.

vi.mock("../tilbehoer-layout", () => ({
  TilbehoerLayout: () => <div data-testid="tilbehoer-layout" />,
}));
vi.mock("../category-faq", () => ({
  CategoryFaq: () => <div data-testid="category-faq" />,
}));
vi.mock("@/components/ui/klarna-micro-banner", () => ({
  KlarnaMicroBanner: () => <div data-testid="klarna-micro-banner" />,
}));

const trustBarMock = vi.fn((props: { variant?: "device" | "accessory" }) => (
  <div data-testid="trust-bar" data-variant={props.variant ?? "device"} />
));
vi.mock("@/components/ui/trust-bar", () => ({
  TrustBar: (props: { variant?: "device" | "accessory" }) => trustBarMock(props),
}));

import { TilbehoerCategoryClient } from "../tilbehoer-category-client";
import { HubPageClient } from "../hub-page-client";
import type { TilbehoerCategory } from "@/lib/tilbehoer-config";

const category: TilbehoerCategory = {
  slug: "covers",
  label: "Covers",
  description: "Covers til iPhone og Samsung",
  deviceSpecific: true,
  heroDescription: "Beskyt din telefon med et cover i høj kvalitet.",
  faq: [],
};

describe("TilbehoerCategoryClient", () => {
  it("renders TrustBar with variant=\"accessory\", never the device default", () => {
    render(<TilbehoerCategoryClient category={category} initialCount={12} />);
    expect(trustBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "accessory" }),
    );
    expect(screen.getByTestId("trust-bar").dataset.variant).toBe("accessory");
  });
});

describe("HubPageClient", () => {
  it("renders TrustBar with variant=\"accessory\", never the device default", () => {
    render(<HubPageClient />);
    expect(trustBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "accessory" }),
    );
    expect(screen.getByTestId("trust-bar").dataset.variant).toBe("accessory");
  });
});

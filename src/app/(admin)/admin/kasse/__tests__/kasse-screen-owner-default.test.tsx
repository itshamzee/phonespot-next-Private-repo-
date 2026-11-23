import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("@/components/admin/shell/store-scope-context", () => ({
  useStoreScope: () => ({ scope: "alle", ownSlug: null, isOwner: true, loading: false }),
}));
vi.mock("@/lib/supabase/client", () => ({ createBrowserClient: () => ({ from: () => ({}) }) }));

const sessionCalls: string[] = [];
vi.mock("@/lib/pos/client", () => ({
  posFetch: vi.fn(async () => ({ ok: true, json: async () => ({ devices: [], skuProducts: [] }) })),
  printBase64Pdf: vi.fn(),
  posJson: vi.fn(async (url: string) => {
    if (url === "/api/pos/locations") {
      return {
        locations: [
          { id: "e", slug: "esbjerg", name: "PhoneSpot Esbjerg" },
          { id: "v", slug: "vejle", name: "PhoneSpot Vejle" },
        ],
      };
    }
    if (url.startsWith("/api/pos/session")) {
      sessionCalls.push(url);
      const id = new URL(url, "http://x").searchParams.get("location_id")!;
      return { registers: [{ id: `r-${id}`, name: `Kasse ${id}`, code: id, locationId: id, openSession: null }] };
    }
    return { tiles: [], categories: [] };
  }),
}));

import { KasseScreen } from "../_components/kasse-screen";

afterEach(cleanup);

describe("Kasse: ejer-standardbutik", () => {
  it("vælger Vejle (ikke Esbjerg, som kommer først alfabetisk) når ingen kasse er åben", async () => {
    render(<KasseScreen />);
    expect(await screen.findAllByText(/Kasse v/)).toBeTruthy();
    expect(sessionCalls.at(-1)).toContain("location_id=v");
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

// Åbnet fra menuen: ingen location_id i adressen.
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("") }));

const scope = vi.hoisted(() => ({ value: "vejle" as string }));
vi.mock("@/components/admin/shell/store-scope-context", () => ({
  useStoreScope: () => ({ scope: scope.value, ownSlug: null, loading: false }),
}));

const calls = vi.hoisted(() => ({ urls: [] as string[] }));
vi.mock("@/lib/pos/client", () => ({
  posFetch: vi.fn(async () => ({ ok: true, json: async () => ({ permissions: [] }) })),
  posJson: vi.fn(async (url: string) => {
    calls.urls.push(url);
    if (url === "/api/pos/locations") {
      return {
        locations: [
          { id: "OLD", name: "Vejle", slug: "vejle" },
          { id: "NEW", name: "Vejle Kontor", slug: "vejle-kontor" },
          { id: "SLA", name: "Slagelse", slug: "slagelse" },
        ],
      };
    }
    if (url.startsWith("/api/pos/session?location_id=NEW")) return { registers: [{ id: "R1", name: "Kasse 1" }] };
    if (url.startsWith("/api/pos/session")) return { registers: [] };
    return { summary: null };
  }),
}));

import CashupPage from "../page";

afterEach(() => {
  cleanup();
  calls.urls = [];
});

describe("Dagsopgørelse uden butik i adressen", () => {
  it("finder selv butikken med aktiv kasse ud fra butiksvalget", async () => {
    scope.value = "vejle";
    render(<CashupPage />);
    await waitFor(() => expect(calls.urls.some((u) => u.startsWith("/api/pos/cashup?location_id=NEW"))).toBe(true));
    expect(screen.queryByText("Ingen lokation valgt")).toBeNull();
    expect((screen.getByLabelText("Butik") as HTMLSelectElement).value).toBe("NEW");
  });

  it("lader ejeren vælge butik, når alle butikker er valgt", async () => {
    scope.value = "alle";
    render(<CashupPage />);
    expect(await screen.findByText(/Vælg den butik/)).toBeTruthy();
    expect(screen.getByLabelText("Butik")).toBeTruthy();
  });
});

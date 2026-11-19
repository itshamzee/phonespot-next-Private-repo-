import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));
vi.mock("../store-scope-context", () => ({
  useStoreScope: () => ({ loading: false, me: { id: "s1", isOwner: false } }),
}));
import { WhatsNew } from "../whats-new";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("WhatsNew", () => {
  it("viser en ny post og gemmer id'et ved Forstået", () => {
    render(<WhatsNew />);
    expect(screen.getByText(/Nyt kundecenter og en klogere assistent/)).toBeInTheDocument();
    expect(screen.queryByText("Til dig som ejer")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Forstået" }));
    expect(JSON.parse(window.localStorage.getItem("ps_whats_new_seen_s1") ?? "[]")).toContain("2026-11-20-kundecenter");
  });

  it("viser intet, når alt er set", () => {
    window.localStorage.setItem("ps_whats_new_seen_s1", JSON.stringify(["2026-11-20-kundecenter"]));
    render(<WhatsNew />);
    expect(screen.queryByText("Nyt i admin")).toBeNull();
  });
});

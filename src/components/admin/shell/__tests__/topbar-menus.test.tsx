import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// Søgefeltet bruger Nexts router, som ikke findes i testen; det er ikke det, der testes her.
vi.mock("@/components/admin/global-search", () => ({ default: () => <input aria-label="Søg i admin" /> }));

import { StoreScopeProvider, type AdminMe } from "../store-scope-context";
import { Topbar } from "../topbar";
import { NotificationsButton } from "../notifications";
import type { NavCounts } from "../sidebar";

const owner: AdminMe = { id: "o", name: "Ejer Hansen", email: "o@phonespot.dk", role: "owner", isOwner: true, ownSlug: null, scope: "alle" };
const counts: NavCounts = { orders: 2, repairs: 0, newRepairs: 0, webBookings: 1, inquiries: 0, buyback: 0 };

afterEach(cleanup);

function renderTopbar() {
  return render(
    <StoreScopeProvider initialMe={owner}>
      <Topbar email="o@phonespot.dk" counts={counts} onMenu={() => {}} onLogout={() => {}} />
    </StoreScopeProvider>,
  );
}

describe("Kontomenuen", () => {
  const trigger = () => screen.getByRole("button", { name: "Konto" });
  const panel = () => document.getElementById(trigger().getAttribute("aria-controls")!)!;

  it("er monteret men lukket og skjult", () => {
    renderTopbar();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(panel()).toHaveAttribute("data-open", "false");
    expect(panel()).toHaveAttribute("aria-hidden", "true");
    expect(panel()).toHaveClass("m-pop");
    expect(panel().className).not.toMatch(/shadow/);
  });

  it("flytter fokus ind ved åbning og tilbage til knappen ved Escape", () => {
    renderTopbar();
    fireEvent.click(trigger());
    expect(panel()).toHaveAttribute("data-open", "true");
    expect(panel()).not.toHaveAttribute("aria-hidden");
    expect(screen.getByRole("menuitem", { name: "Profil og signatur" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(panel()).toHaveAttribute("data-open", "false");
    expect(trigger()).toHaveFocus();
  });

  it("lukker og giver fokus tilbage, når et punkt vælges", () => {
    renderTopbar();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Profil og signatur" }));
    expect(panel()).toHaveAttribute("data-open", "false");
    expect(trigger()).toHaveFocus();
  });

  it("lukker ved klik udenfor", () => {
    renderTopbar();
    fireEvent.click(trigger());
    fireEvent.mouseDown(document.body);
    expect(panel()).toHaveAttribute("data-open", "false");
  });
});

describe("Notifikationer", () => {
  const trigger = () => screen.getByRole("button", { name: /^Notifikationer/ });
  const panel = () => document.getElementById(trigger().getAttribute("aria-controls")!)!;

  it("er monteret men lukket og skjult", () => {
    render(<NotificationsButton counts={counts} />);
    expect(panel()).toHaveAttribute("data-open", "false");
    expect(panel()).toHaveAttribute("aria-hidden", "true");
    expect(panel()).toHaveClass("m-pop");
    expect(panel().className).not.toMatch(/shadow/);
  });

  it("flytter fokus til første punkt og tilbage til knappen ved Escape", () => {
    render(<NotificationsButton counts={counts} />);
    fireEvent.click(trigger());
    expect(panel()).toHaveAttribute("data-open", "true");
    expect(screen.getByRole("menuitem", { name: "2 nye webshop-ordrer" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(panel()).toHaveAttribute("data-open", "false");
    expect(trigger()).toHaveFocus();
  });

  it("uden noget nyt får panelet selv fokus", () => {
    render(<NotificationsButton counts={{ ...counts, orders: 0, webBookings: 0 }} />);
    fireEvent.click(trigger());
    expect(panel()).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger()).toHaveFocus();
  });
});

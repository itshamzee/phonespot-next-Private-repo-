import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { StoreScopeProvider, type AdminMe } from "../store-scope-context";
import { Sidebar, type NavCounts } from "../sidebar";
import { initialsOf } from "../topbar";
import { notificationItems } from "../notifications";

const owner: AdminMe = { id: "o", name: "Ejer", email: "o@phonespot.dk", role: "owner", isOwner: true, ownSlug: null, scope: "alle" };
const vejle: AdminMe = { id: "v", name: "Mikkel", email: "v@phonespot.dk", role: "employee", isOwner: false, ownSlug: "vejle", scope: "vejle" };

const counts: NavCounts = { orders: 2, repairs: 3, newRepairs: 1, inquiries: 4, buyback: 0 };

function renderSidebar(me: AdminMe, pathname = "/admin") {
  return render(
    <StoreScopeProvider initialMe={me}>
      <Sidebar pathname={pathname} counts={counts} open onNavigate={() => {}} />
    </StoreScopeProvider>,
  );
}

afterEach(cleanup);

describe("Sidebar", () => {
  it("medarbejdere ser alle punkter undtagen Økonomi", () => {
    renderSidebar(vejle);
    const nav = screen.getByRole("navigation", { name: "Hovedmenu" });
    const labels = within(nav).getAllByRole("link").map((a) => a.textContent?.replace(/\d+$/, ""));
    expect(labels).toEqual(["Overblik", "Sagsstyring", "Kasse", "Kunder", "Varer", "Opkøb", "Statistik"]);
    expect(screen.queryByText("Økonomi")).toBeNull();
    expect(screen.getByText("Indstillinger")).toBeTruthy();
  });

  it("ejeren ser også Økonomi", () => {
    renderSidebar(owner);
    expect(screen.getByRole("link", { name: "Økonomi" }).getAttribute("href")).toBe("/admin/okonomi");
  });

  it("peger på de aftalte adresser", () => {
    renderSidebar(owner);
    const href = (name: string) => screen.getByRole("link", { name: new RegExp(`^${name}`) }).getAttribute("href");
    expect(href("Overblik")).toBe("/admin");
    expect(href("Sagsstyring")).toBe("/admin/reparationer");
    expect(href("Kasse")).toBe("/admin/kasse");
    expect(href("Kunder")).toBe("/admin/kunder");
    expect(href("Varer")).toBe("/admin/varer");
    expect(href("Opkøb")).toBe("/admin/opkoeb");
    expect(href("Statistik")).toBe("/admin/statistik");
    expect(href("Indstillinger")).toBe("/admin/indstillinger");
  });

  it("viser åbne sager som tal ved Sagsstyring, og flytter det til Sager når området er åbent", () => {
    renderSidebar(vejle, "/admin/kunder");
    expect(screen.getByRole("link", { name: /^Sagsstyring/ }).textContent).toContain("3");
    cleanup();
    renderSidebar(vejle, "/admin/reparationer/abc");
    const sager = screen.getByRole("link", { name: /^Sager/ });
    expect(sager.getAttribute("aria-current")).toBe("page");
    expect(sager.textContent).toContain("3");
  });

  it("Medarbejdere under Indstillinger er kun synligt for ejeren", () => {
    renderSidebar(vejle, "/admin/indstillinger");
    expect(screen.queryByRole("link", { name: "Medarbejdere" })).toBeNull();
    cleanup();
    renderSidebar(owner, "/admin/indstillinger");
    expect(screen.getByRole("link", { name: "Medarbejdere" })).toBeTruthy();
  });
});

describe("topbar-hjælpere", () => {
  it("forbogstaver", () => {
    expect(initialsOf("Mikkel Kjær", null)).toBe("MK");
    expect(initialsOf("Mikkel", null)).toBe("MI");
    expect(initialsOf(null, "hamza@phonespot.dk")).toBe("H");
  });

  it("notifikationer viser kun det, der venter", () => {
    expect(notificationItems(counts).map((i) => i.key)).toEqual(["orders", "repairs", "inquiries"]);
    expect(notificationItems({ orders: 0, repairs: 9, newRepairs: 0, inquiries: 0, buyback: 0 })).toEqual([]);
  });
});

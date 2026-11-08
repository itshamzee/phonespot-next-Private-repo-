import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { StaffAccessPanel } from "../staff-access-panel";

afterEach(cleanup);

function row(role: string) {
  return { id: "s1", name: "Mads", role, permissions: [], hasPin: true, pinLocked: false };
}

function item(label: string) {
  return screen.getByText(label).closest("li") as HTMLElement;
}

describe("StaffAccessPanel", () => {
  it("markerer ikke-håndhævede tilladelser med Træder i kraft senere", () => {
    render(<StaffAccessPanel row={row("employee")} saving={false} onSave={vi.fn()} onClose={vi.fn()} />);
    for (const l of ["Se statistik", "Rette priser", "Se andre butikkers omsætning", "Give rabat"]) {
      expect(within(item(l)).getByText("Træder i kraft senere")).toBeTruthy();
    }
    for (const l of ["Lave retur", "Lukke dagen", "Eksportere"]) {
      expect(within(item(l)).queryByText("Træder i kraft senere")).toBeNull();
    }
  });

  it("manager følger rollen på Se indkøbspris uden forbehold", () => {
    render(<StaffAccessPanel row={row("manager")} saving={false} onSave={vi.fn()} onClose={vi.fn()} />);
    const li = item("Se indkøbspris");
    expect(within(li).getByText("Følger rollen")).toBeTruthy();
    expect(within(li).queryByText("Træder i kraft senere")).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { StatPayload } from "@/lib/admin/statistik/payload";
import { ExportControl } from "../controls";

const range: StatPayload["range"] = {
  preset: "30d",
  from: "2026-10-20",
  to: "2026-11-18",
  rangeLabel: "20. okt. – 18. nov. 2026",
  compareLabel: "mod de 30 dage før",
  unit: "dag",
};
const viewer = (canExport: boolean, scope: StatPayload["viewer"]["scope"] = "vejle"): StatPayload["viewer"] => ({ isOwner: false, canExport, scope });

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const toggle = () => screen.getByRole("button", { name: "Eksportér" });

describe("Eksportér", () => {
  it("vises kun med rettigheden eksportere", () => {
    const { rerender } = render(<ExportControl viewer={viewer(false)} range={range} />);
    expect(screen.queryByRole("button", { name: "Eksportér" })).toBeNull();
    rerender(<ExportControl viewer={viewer(true)} range={range} />);
    expect(toggle()).toBeInTheDocument();
  });

  it("åbner med de tre punkter og lukker ved Escape og klik udenfor", () => {
    render(<ExportControl viewer={viewer(true)} range={range} />);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Regneark \(CSV\)/ })).toHaveTextContent("Tal pr. dag for den valgte periode og butik");
    expect(screen.getByRole("button", { name: /^Excel/ })).toHaveTextContent("Alle afsnit på hver sin fane");
    expect(screen.getByRole("button", { name: /PDF til print/ })).toHaveTextContent("Siden som den ser ud nu");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveFocus();

    fireEvent.click(toggle());
    fireEvent.mouseDown(document.body);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("PDF til print åbner browserens print", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<ExportControl viewer={viewer(true)} range={range} />);
    fireEvent.click(toggle());
    fireEvent.click(screen.getByRole("button", { name: /PDF til print/ }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    print.mockRestore();
  });

  it("CSV henter filen med sidens periode og butik og viser en toast", async () => {
    fetchMock.mockResolvedValue(
      new Response("﻿Periode", { headers: { "Content-Disposition": 'attachment; filename="phonespot-statistik-2026-10-20_2026-11-18-vejle.csv"' } }),
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<ExportControl viewer={viewer(true)} range={range} />);
    fireEvent.click(toggle());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Regneark \(CSV\)/ }));
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/statistik/export?format=csv&periode=30d&butik=vejle");
    expect(click).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Regnearket er hentet");
    click.mockRestore();
  });

  it("frie datoer sendes som fra og til", async () => {
    fetchMock.mockResolvedValue(new Response("x", { status: 500 }));
    render(<ExportControl viewer={viewer(true, "alle")} range={{ ...range, preset: "valg" }} />);
    fireEvent.click(toggle());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Excel/ }));
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/statistik/export?format=xlsx&fra=2026-10-20&til=2026-11-18&butik=alle");
    expect(screen.getByRole("status")).toHaveTextContent("Filen kunne ikke hentes. Prøv igen.");
  });
});

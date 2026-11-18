import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/statistik",
  useSearchParams: () => new URLSearchParams("butik=vejle&periode=7d"),
}));

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RangeStepper, StatNavProvider } from "../controls";
import { statRange, type StatPreset } from "@/lib/admin/statistik/range";

const NOW = new Date("2026-11-18T13:32:00Z");
const TODAY = "2026-11-18";
const MIN = "2026-03-10";

function show(input: StatPreset | { from: string; to: string }) {
  const r = statRange(input, NOW);
  const range = { preset: r.preset, from: r.from, to: r.to, rangeLabel: r.rangeLabel, compareLabel: r.compareLabel, unit: r.unit };
  return render(
    <StatNavProvider>
      <RangeStepper range={range} minDate={MIN} today={TODAY} />
      <input aria-label="Andet felt" />
    </StatNavProvider>,
  );
}

/** Den sidste navigation som søgeparametre. */
function lastQuery(): URLSearchParams {
  const url: string = replace.mock.calls.at(-1)![0];
  return new URLSearchParams(url.split("?")[1] ?? "");
}

beforeEach(() => replace.mockClear());
afterEach(cleanup);

describe("RangeStepper", () => {
  it("names the buttons per day for a single day", () => {
    show({ from: "2026-11-10", to: "2026-11-10" });
    expect(screen.getByRole("button", { name: "Forrige dag" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Næste dag" })).toBeInTheDocument();
    expect(screen.getByText("Tirsdag 10. nov. 2026")).toBeInTheDocument();
  });

  it("names the buttons per period for several days", () => {
    show("30d");
    expect(screen.getByRole("button", { name: "Forrige periode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Næste periode" })).toBeInTheDocument();
  });

  it("disables next on a range ending today and does nothing on click", () => {
    show("7d");
    const next = screen.getByRole("button", { name: "Næste periode" });
    expect(next).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(next);
    expect(replace).not.toHaveBeenCalled();
  });

  it("previous from a 7-day range sets fra and til and clears periode, keeping the store", () => {
    show("7d");
    fireEvent.click(screen.getByRole("button", { name: "Forrige periode" }));
    const q = lastQuery();
    expect(q.get("fra")).toBe("2026-11-05");
    expect(q.get("til")).toBe("2026-11-11");
    expect(q.has("periode")).toBe(false);
    expect(q.get("butik")).toBe("vejle");
  });

  it("previous from today lands on periode=igaar", () => {
    show("idag");
    fireEvent.click(screen.getByRole("button", { name: "Forrige dag" }));
    const q = lastQuery();
    expect(q.get("periode")).toBe("igaar");
    expect(q.has("fra")).toBe(false);
    expect(q.has("til")).toBe(false);
  });

  it("next from yesterday lands on periode=idag", () => {
    show("igaar");
    fireEvent.click(screen.getByRole("button", { name: "Næste dag" }));
    expect(lastQuery().get("periode")).toBe("idag");
  });

  it("hides I dag when the range already is today, and jumps there otherwise", () => {
    const { unmount } = show("idag");
    expect(screen.queryByRole("button", { name: "I dag" })).toBeNull();
    unmount();

    show({ from: "2026-11-10", to: "2026-11-10" });
    fireEvent.click(screen.getByRole("button", { name: "I dag" }));
    const q = lastQuery();
    expect(q.get("periode")).toBe("idag");
    expect(q.has("fra")).toBe(false);
  });

  it("ArrowLeft steps back from the page, but not while an input has focus", () => {
    show({ from: "2026-11-10", to: "2026-11-10" });
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(lastQuery().get("fra")).toBe("2026-11-09");

    replace.mockClear();
    const input = screen.getByRole("textbox", { name: "Andet felt" });
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowLeft" });
    expect(replace).not.toHaveBeenCalled();
  });

  it("ArrowRight steps forward and ignores modified keys", () => {
    show({ from: "2026-11-10", to: "2026-11-10" });
    fireEvent.keyDown(document.body, { key: "ArrowRight", altKey: true });
    expect(replace).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(lastQuery().get("fra")).toBe("2026-11-11");
  });
});

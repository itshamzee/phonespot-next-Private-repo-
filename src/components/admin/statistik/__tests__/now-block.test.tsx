import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { NowBlock } from "../now-block";
import type { NowBlock as NowData } from "@/lib/admin/statistik/payload";

const zeroMoney = { revenue: 0, revenueInclVat: 0 };

function nowData(revenue: number): NowData {
  return {
    updatedAt: "2026-11-18T13:32:00.000Z",
    today: {
      revenue,
      revenueInclVat: Math.round(revenue * 1.25),
      count: 3,
      deltaPct: 5,
      hours: Array.from({ length: 11 }, (_, i) => ({ label: String(9 + i), revenue: 0, future: i > 5 })),
      streams: { webshop: 0, kasse: 0, reparation: 0 },
    },
    rows: [
      { key: "igaar", label: "I går", money: zeroMoney, deltaPct: null, compareLabel: "mod samme ugedag ugen før" },
      { key: "uge", label: "Denne uge", money: zeroMoney, deltaPct: null, compareLabel: "mod samme tid sidste uge" },
      { key: "maaned", label: "Denne måned", money: zeroMoney, deltaPct: null, compareLabel: "mod samme tid sidste måned" },
    ],
  };
}

let hidden = false;
const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const advance = (ms: number) => act(async () => {
  await vi.advanceTimersByTimeAsync(ms);
});

const ok = (data: NowData) => Promise.resolve({ ok: true, json: async () => data } as Response);

describe("NowBlock", () => {
  it("henter igen hvert minut og viser de nye tal", async () => {
    fetchMock.mockImplementation(() => ok(nowData(2_500_000)));
    render(<NowBlock initial={nowData(1_200_000)} isOwner={false} butik="vejle" />);
    expect(screen.getByText("12.000 kr.")).toBeInTheDocument();

    await advance(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/statistik/now?butik=vejle");
    await advance(50); // tallet tæller op over et par frames
    expect(screen.getByText("25.000 kr.")).toBeInTheDocument();
  });

  it("en fejlet opdatering beholder de sidste tal og viser Kunne ikke opdatere", async () => {
    fetchMock.mockImplementation(() => Promise.resolve({ ok: false, status: 500 } as Response));
    render(<NowBlock initial={nowData(1_200_000)} isOwner={false} butik="vejle" />);
    expect(screen.queryByText("Kunne ikke opdatere")).toBeNull();

    await advance(60_000);
    expect(screen.getByText("Kunne ikke opdatere")).toBeInTheDocument();
    expect(screen.getByText("12.000 kr.")).toBeInTheDocument();
  });

  it("henter ikke, mens fanen er skjult", async () => {
    hidden = true;
    render(<NowBlock initial={nowData(1_200_000)} isOwner={false} butik="vejle" />);
    await advance(180_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("henter én gang, når fanen bliver synlig igen, også ved flere hændelser", async () => {
    hidden = true;
    let resolve: (r: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (resolve = r)));
    render(<NowBlock initial={nowData(1_200_000)} isOwner={false} butik="vejle" />);

    hidden = false;
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => resolve({ ok: true, json: async () => nowData(3_000_000) } as Response));
    await advance(50); // tallet tæller op over et par frames
    expect(screen.getByText("30.000 kr.")).toBeInTheDocument();
  });
});

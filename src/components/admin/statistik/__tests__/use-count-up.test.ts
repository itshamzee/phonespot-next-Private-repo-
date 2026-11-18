import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCountUp } from "../use-count-up";

/** Frames køres manuelt med et valgt tidspunkt. */
let frames: FrameRequestCallback[] = [];
function runFrame(t: number) {
  const pending = frames;
  frames = [];
  act(() => pending.forEach((cb) => cb(t)));
}

function stubMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce"), media: query }));
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.spyOn(performance, "now").mockReturnValue(1000);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useCountUp", () => {
  it("første visning står med den rigtige værdi og animerer ikke", () => {
    stubMotion(false);
    const { result } = renderHook(() => useCountUp(500));
    expect(result.current).toBe(500);
    expect(frames).toHaveLength(0);
  });

  it("en ny værdi tæller fra den gamle til den nye", () => {
    stubMotion(false);
    const { result, rerender } = renderHook(({ v }) => useCountUp(v, 400), { initialProps: { v: 100 } });
    rerender({ v: 200 });
    expect(result.current).toBe(100);

    runFrame(1200); // halvvejs
    expect(result.current).toBeGreaterThan(100);
    expect(result.current).toBeLessThan(200);

    runFrame(1400); // færdig
    expect(result.current).toBe(200);
    expect(frames).toHaveLength(0);
  });

  it("under reduced motion springer tallet direkte", () => {
    stubMotion(true);
    const { result, rerender } = renderHook(({ v }) => useCountUp(v, 400), { initialProps: { v: 100 } });
    rerender({ v: 200 });
    runFrame(1001);
    expect(result.current).toBe(200);
    expect(frames).toHaveLength(0);
  });
});

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHasChanged } from "../use-has-changed";

describe("useHasChanged", () => {
  it("is false on first render and stays true once the value has changed", () => {
    const { result, rerender } = renderHook(({ v }) => useHasChanged(v), { initialProps: { v: 4999 } });
    expect(result.current).toBe(false);
    rerender({ v: 4999 });
    expect(result.current).toBe(false);
    rerender({ v: 5499 });
    expect(result.current).toBe(true);
    rerender({ v: 4999 });
    expect(result.current).toBe(true);
  });
});

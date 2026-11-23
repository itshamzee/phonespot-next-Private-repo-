import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { FadeIn } from "../fade-in";

let trigger: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
class FakeObserver {
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
    trigger = cb;
  }
  observe() {}
  disconnect() {}
}

describe("FadeIn", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    trigger = null;
  });

  it("never hides content and leaves sections already in view alone", () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    render(<FadeIn><p>Synlig tekst</p></FadeIn>);
    const box = screen.getByText("Synlig tekst").parentElement!;
    expect(box).toHaveAttribute("data-fade", "idle");
    act(() => trigger?.([{ isIntersecting: true }]));
    expect(box).toHaveAttribute("data-fade", "idle");
    expect(box.style.opacity).toBe("");
    expect(box.style.translate).toBe("");
  });

  it("only nudges sections below the fold, and never via opacity", () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    render(<FadeIn delay={2} duration={1}><p>Længere nede</p></FadeIn>);
    const box = screen.getByText("Længere nede").parentElement!;
    act(() => trigger?.([{ isIntersecting: false }]));
    expect(box).toHaveAttribute("data-fade", "waiting");
    expect(box.style.opacity).toBe("");
    act(() => trigger?.([{ isIntersecting: true }]));
    expect(box).toHaveAttribute("data-fade", "shown");
    expect(box.style.transition).toContain("0.3s");
    expect(box.style.transition).toContain("0.12s");
  });
});

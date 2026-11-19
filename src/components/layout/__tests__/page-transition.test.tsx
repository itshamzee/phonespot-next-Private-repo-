import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

let pathname = "/";
let search = "";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));

import { usePageTransition, PAGE_ENTER_ATTR } from "../page-transition";

function Shell({ children }: { children: React.ReactNode }) {
  const ref = usePageTransition<HTMLElement>();
  return <main ref={ref} data-testid="main">{children}</main>;
}

describe("usePageTransition", () => {
  beforeEach(() => {
    pathname = "/";
    search = "";
  });

  it("leaves the first render alone", () => {
    render(<Shell><p>Forside</p></Shell>);
    expect(screen.getByTestId("main").hasAttribute(PAGE_ENTER_ATTR)).toBe(false);
  });

  it("sets the flag when the path changes, without remounting children", () => {
    const { rerender } = render(<Shell><p data-testid="child">Forside</p></Shell>);
    const child = screen.getByTestId("child");
    pathname = "/iphones";
    rerender(<Shell><p data-testid="child">Forside</p></Shell>);
    expect(screen.getByTestId("main").hasAttribute(PAGE_ENTER_ATTR)).toBe(true);
    expect(screen.getByTestId("child")).toBe(child);
  });

  it("removes the flag when the animation ends", () => {
    const { rerender } = render(<Shell><p>Forside</p></Shell>);
    pathname = "/iphones";
    rerender(<Shell><p>iPhones</p></Shell>);
    const main = screen.getByTestId("main");
    main.dispatchEvent(new Event("animationend"));
    expect(main.hasAttribute(PAGE_ENTER_ATTR)).toBe(false);
  });

  it("ignores search-param-only changes (filters, sorting, ?fiks=)", () => {
    pathname = "/iphones";
    const { rerender } = render(<Shell><p>iPhones</p></Shell>);
    search = "sort=price-asc&fiks=abc";
    rerender(<Shell><p>iPhones</p></Shell>);
    expect(screen.getByTestId("main").hasAttribute(PAGE_ENTER_ATTR)).toBe(false);
  });
});

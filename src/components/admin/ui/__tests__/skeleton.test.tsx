import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PageSkeleton, Skeleton } from "../skeleton";

afterEach(cleanup);

describe("Skeleton", () => {
  it("er en skjult, statisk blok med pulsklassen og egne mål", () => {
    const { container } = render(<Skeleton className="h-4 w-32 rounded-md" />);
    const el = container.firstElementChild!;
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el.className).toContain("m-skeleton");
    expect(el.className).toContain("bg-[#EEF0EC]");
    expect(el.className).toContain("h-4 w-32 rounded-md");
  });

  it("sideskelettet har en overskriftsbjælke og tre flader og melder sig optaget", () => {
    render(<PageSkeleton />);
    const page = screen.getByLabelText("Indlæser");
    expect(page).toHaveAttribute("aria-busy", "true");
    expect(page.querySelectorAll("[data-skeleton-surface]")).toHaveLength(3);
  });
});

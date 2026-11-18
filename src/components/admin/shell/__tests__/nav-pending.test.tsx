import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Link from "next/link";

const status = vi.hoisted(() => ({ pending: false }));
vi.mock("next/link", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/link")>();
  return { ...actual, useLinkStatus: () => ({ pending: status.pending }) };
});

import { NavPendingBar, NavPendingProvider, NavPendingSignal } from "../nav-pending";

function Shell() {
  return (
    <NavPendingProvider>
      <div className="relative">
        <NavPendingBar />
      </div>
      <Link href="/admin/kunder">
        Kunder
        <NavPendingSignal />
      </Link>
    </NavPendingProvider>
  );
}

afterEach(() => {
  cleanup();
  status.pending = false;
});

describe("NavPending", () => {
  it("viser ingen streg, når intet link venter", () => {
    render(<Shell />);
    expect(screen.queryByTestId("nav-pending-bar")).toBeNull();
  });

  it("viser stregen, mens et link venter, og fjerner den igen", () => {
    status.pending = true;
    const { rerender } = render(<Shell />);
    const bar = screen.getByTestId("nav-pending-bar");
    expect(bar).toHaveClass("m-pending-bar");
    expect(bar).toHaveAttribute("aria-hidden", "true");

    status.pending = false;
    rerender(<Shell />);
    expect(screen.queryByTestId("nav-pending-bar")).toBeNull();
  });

  it("signalet gør ingenting uden udbyder", () => {
    status.pending = true;
    expect(() =>
      render(
        <Link href="/admin">
          Overblik
          <NavPendingSignal />
        </Link>,
      ),
    ).not.toThrow();
  });
});

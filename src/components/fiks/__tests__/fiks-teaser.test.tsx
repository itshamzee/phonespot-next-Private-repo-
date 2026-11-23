import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/dynamic", async () => {
  const mod = await import("../fiks-panel");
  return { default: () => mod.FiksPanel };
});

const path = { current: "/" };
vi.mock("next/navigation", () => ({ usePathname: () => path.current }));

import { FiksChat } from "../fiks-chat";
import { BUYBACK_STARTER } from "../fiks-shared";
import {
  TEASER_DELAY_MS,
  TEASER_RECHECK_MS,
  TEASER_SEEN_KEY,
  TEASER_VISIBLE_MS,
  teaserAllowedOn,
} from "../fiks-teaser";

const HEADLINE = "Vi køber din gamle telefon";
const fetchMock = vi.fn();
let visibility: DocumentVisibilityState = "visible";

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  path.current = "/";
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.localStorage.setItem("cookie-consent", "rejected");
  fetchMock.mockReset();
  fetchMock.mockImplementation(() =>
    Promise.resolve(new Response(JSON.stringify({ token: "t", reply: "Hvilken model har du?" }), { status: 200 })),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("teaserAllowedOn", () => {
  it("blocks the sell form, checkout, basket and admin, and nothing else", () => {
    for (const p of ["/saelg-din-enhed", "/saelg-din-enhed/iphone/iphone-13", "/checkout", "/checkout/tak", "/kurv", "/admin/kundecenter"]) {
      expect(teaserAllowedOn(p)).toBe(false);
    }
    for (const p of ["/", "/reparation", "/iphone", "/saelg", "/kurve-og-tasker", "/administration-info"]) {
      expect(teaserAllowedOn(p)).toBe(true);
    }
  });
});

describe("Fiks teaser", () => {
  it("is not rendered at first and appears after the delay as a status, without taking focus", async () => {
    render(<FiksChat />);
    expect(screen.queryByText(HEADLINE)).toBeNull();
    await advance(TEASER_DELAY_MS - 100);
    expect(screen.queryByText(HEADLINE)).toBeNull();
    await advance(200);
    expect(screen.getByRole("status")).toHaveTextContent(HEADLINE);
    expect(screen.getByText("Få en vejledende pris på et minut.")).toBeInTheDocument();
    expect(document.activeElement).toBe(document.body);
    expect(window.sessionStorage.getItem(TEASER_SEEN_KEY)).toBe("1");
  });

  it("hides itself after a while", async () => {
    render(<FiksChat />);
    await advance(TEASER_DELAY_MS + 100);
    expect(screen.getByText(HEADLINE)).toBeInTheDocument();
    await advance(TEASER_VISIBLE_MS - 1000);
    expect(screen.getByText(HEADLINE)).toBeInTheDocument();
    await advance(1100);
    // The exit plays, then it is gone.
    await advance(300);
    expect(screen.queryByText(HEADLINE)).toBeNull();
  });

  it("shows only once per browser session", async () => {
    window.sessionStorage.setItem(TEASER_SEEN_KEY, "1");
    render(<FiksChat />);
    await advance(TEASER_DELAY_MS * 3);
    expect(screen.queryByText(HEADLINE)).toBeNull();
  });

  it("waits until a cookie choice exists", async () => {
    window.localStorage.clear();
    render(<FiksChat />);
    await advance(TEASER_DELAY_MS + 3 * TEASER_RECHECK_MS);
    expect(screen.queryByText(HEADLINE)).toBeNull();
    window.localStorage.setItem("cookie-consent", "accepted");
    await advance(TEASER_RECHECK_MS + 10);
    expect(screen.getByText(HEADLINE)).toBeInTheDocument();
  });

  it("waits while the tab is hidden", async () => {
    visibility = "hidden";
    render(<FiksChat />);
    await advance(TEASER_DELAY_MS + 5 * TEASER_RECHECK_MS);
    expect(screen.queryByText(HEADLINE)).toBeNull();
    visibility = "visible";
    await advance(TEASER_RECHECK_MS + 10);
    expect(screen.getByText(HEADLINE)).toBeInTheDocument();
  });

  it("never shows on the sell form, checkout, basket or admin", async () => {
    for (const p of ["/saelg-din-enhed", "/checkout", "/kurv", "/admin"]) {
      path.current = p;
      window.sessionStorage.clear();
      const { unmount } = render(<FiksChat />);
      await advance(TEASER_DELAY_MS * 2);
      expect(screen.queryByText(HEADLINE)).toBeNull();
      unmount();
    }
  });

  it("does not show when the chat was opened before the delay", async () => {
    render(<FiksChat />);
    fireEvent.click(screen.getByRole("button", { name: "Åbn chat med Fiks" }));
    await advance(TEASER_DELAY_MS * 2);
    expect(screen.queryByText(HEADLINE)).toBeNull();
  });

  it("closes with the close button", async () => {
    render(<FiksChat />);
    await advance(TEASER_DELAY_MS + 100);
    fireEvent.click(screen.getByRole("button", { name: "Luk" }));
    await advance(300);
    expect(screen.queryByText(HEADLINE)).toBeNull();
    // The launcher is still there.
    expect(screen.getByRole("button", { name: "Åbn chat med Fiks" })).toBeInTheDocument();
  });

  it("disappears at once when the chat opens", async () => {
    render(<FiksChat />);
    await advance(TEASER_DELAY_MS + 100);
    fireEvent.click(screen.getByRole("button", { name: "Åbn chat med Fiks" }));
    expect(screen.queryByText(HEADLINE)).toBeNull();
  });

  it("'Få en pris' opens the chat and asks the buyback starter", async () => {
    render(<FiksChat />);
    await advance(TEASER_DELAY_MS + 100);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Få en pris" }));
    });
    expect(screen.queryByText(HEADLINE)).toBeNull();
    expect(screen.getByRole("region", { name: "Chat med Fiks" })).toBeVisible();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(post![1].body)).toMatchObject({ message: BUYBACK_STARTER });
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
});

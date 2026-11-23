import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
let pathname = "/";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => pathname }));

import { HeaderSearch, SUGGEST_DEBOUNCE_MS } from "../header-search";

type Body = { products: unknown[]; shortcuts: unknown[] };
const iphoneBody: Body = {
  products: [
    { type: "product", kind: "device", title: "iPhone 13", href: "/refurbished/iphone-13", image: null, priceOere: 249900 },
    { type: "product", kind: "accessory", title: "Cover til iPhone 13", href: "/tilbehoer/covers/cover-13", image: null, priceOere: 9900 },
  ],
  shortcuts: [{ type: "sell", label: "Sælg iPhone 13", href: "/saelg-din-enhed/iphone/iphone-13" }],
};

/** fetch, der kan besvares i en valgfri rækkefølge. */
function deferredFetch() {
  const calls: { url: string; signal: AbortSignal; resolve: (body: Body) => void }[] = [];
  const fn = vi.fn((url: string, init: { signal: AbortSignal }) => new Promise((resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    calls.push({ url, signal: init.signal, resolve: (body) => resolve({ ok: true, json: async () => body }) });
  }));
  return { fn, calls };
}

const input = () => screen.getByRole("combobox", { name: "Søg efter model eller tilbehør" });
async function type(value: string) {
  fireEvent.change(input(), { target: { value } });
}
async function flushDebounce() {
  await act(async () => { vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS); });
}
async function respond(call: { resolve: (body: Body) => void }, body: Body) {
  await act(async () => { call.resolve(body); await Promise.resolve(); await Promise.resolve(); });
}

let fetchMock: ReturnType<typeof deferredFetch>;
beforeEach(() => {
  vi.useFakeTimers();
  pathname = "/";
  push.mockReset();
  fetchMock = deferredFetch();
  vi.stubGlobal("fetch", fetchMock.fn);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("HeaderSearch", () => {
  it("renders nothing but the field before typing, and still submits to /soeg", () => {
    const { container } = render(<HeaderSearch />);
    expect(screen.getByRole("search")).toHaveAttribute("action", "/soeg");
    expect(input()).toHaveAttribute("name", "q");
    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(input()).toHaveAttribute("enterkeyhint", "search");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(container.querySelectorAll("li, ul")).toHaveLength(0);
  });

  it("waits for two characters and debounces, aborting the previous request", async () => {
    render(<HeaderSearch />);
    await type("i");
    await flushDebounce();
    expect(fetchMock.fn).not.toHaveBeenCalled();

    await type("ip");
    await act(async () => { vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS - 10); });
    expect(fetchMock.fn).not.toHaveBeenCalled();
    await type("iph");
    await flushDebounce();
    expect(fetchMock.fn).toHaveBeenCalledTimes(1);
    expect(fetchMock.calls[0].url).toBe("/api/search?suggest=1&limit=5&q=iph");

    await type("iphone 13");
    await flushDebounce();
    expect(fetchMock.calls).toHaveLength(2);
    expect(fetchMock.calls[0].signal.aborted).toBe(true);
    expect(fetchMock.calls[1].url).toBe("/api/search?suggest=1&limit=5&q=iphone%2013");
  });

  it("shows a skeleton on first load, then products, shortcuts and a see-all row", async () => {
    render(<HeaderSearch />);
    await type("iphone 13");
    await flushDebounce();
    expect(input()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox", { hidden: true }).parentElement?.querySelector("[aria-hidden='true']")).not.toBeNull();
    await respond(fetchMock.calls[0], iphoneBody);

    const list = screen.getByRole("listbox", { name: "Søgeforslag" });
    const options = within(list).getAllByRole("option");
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent("iPhone 13fra 2.499 kr.");
    expect(options[1]).toHaveTextContent("Cover til iPhone 1399 kr.");
    expect(within(options[2]).getByRole("link")).toHaveAttribute("href", "/saelg-din-enhed/iphone/iphone-13");
    expect(within(options[3]).getByRole("link")).toHaveAttribute("href", "/soeg?q=iphone%2013");
    expect(options[3]).toHaveTextContent("Se alle resultater for “iphone 13”");
    expect(screen.getByRole("status")).toHaveTextContent("3 forslag");
  });

  it("moves with arrow keys and navigates to the active option on Enter", async () => {
    render(<HeaderSearch />);
    await type("iphone 13");
    await flushDebounce();
    await respond(fetchMock.calls[0], iphoneBody);

    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(input()).toHaveAttribute("aria-activedescendant", options[1].id);
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    expect(options[3]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input(), { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/refurbished/iphone-13");
    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(input()).toHaveValue("iphone 13");
  });

  it("submits the form as before when Enter is pressed without an active option", async () => {
    render(<HeaderSearch />);
    await type("  iphone 13 ");
    await flushDebounce();
    await respond(fetchMock.calls[0], iphoneBody);
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(push).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole("search"));
    expect(push).toHaveBeenCalledWith("/soeg?q=iphone%2013");
    expect(input()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape and Tab but keeps the text, and closes on outside clicks", async () => {
    render(<div><HeaderSearch /><p>Udenfor</p></div>);
    await type("iphone 13");
    await flushDebounce();
    await respond(fetchMock.calls[0], iphoneBody);

    const escape = fireEvent.keyDown(input(), { key: "Escape" });
    expect(escape).toBe(false); // preventDefault: søgefeltet ryddes ikke
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input()).toHaveValue("iphone 13");

    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(input(), { key: "Tab" });
    expect(screen.queryByRole("listbox")).toBeNull();

    fireEvent.focus(input());
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText("Udenfor"));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows the empty state when nothing matches", async () => {
    render(<HeaderSearch />);
    await type("zzz");
    await flushDebounce();
    await respond(fetchMock.calls[0], { products: [], shortcuts: [] });
    expect(screen.getByText("Ingen forslag. Tryk Enter for at søge.")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent("Ingen forslag");
  });

  it("ignores a response that arrives after a newer one", async () => {
    // Uden afbrydelse (fx en browser, der ignorerer signalet) må det gamle svar ikke vinde.
    const calls: ((body: Body) => void)[] = [];
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => calls.push((body) => resolve({ ok: true, json: async () => body })))));
    render(<HeaderSearch />);
    await type("ipho");
    await flushDebounce();
    await type("iphone 13");
    await flushDebounce();
    await respond({ resolve: calls[1] }, iphoneBody);
    await respond({ resolve: calls[0] }, { products: [{ type: "product", kind: "device", title: "Forældet", href: "/x", image: null, priceOere: null }], shortcuts: [] });
    expect(screen.queryByText("Forældet")).toBeNull();
    expect(screen.getAllByRole("option")[0]).toHaveTextContent("iPhone 13");
  });

  it("falls back silently to plain search when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, json: async () => ({}) })));
    render(<HeaderSearch />);
    await type("iphone");
    await flushDebounce();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input()).toHaveAttribute("aria-expanded", "false");
  });

  it("clears stale suggestions on route change", async () => {
    const { rerender } = render(<HeaderSearch />);
    await type("iphone 13");
    await flushDebounce();
    await respond(fetchMock.calls[0], iphoneBody);
    fireEvent.click(within(screen.getAllByRole("option")[0]).getByRole("link"));
    expect(screen.queryByRole("listbox")).toBeNull();
    pathname = "/refurbished/iphone-13";
    rerender(<HeaderSearch />);
    fireEvent.focus(input());
    expect(screen.queryByText("Cover til iPhone 13")).toBeNull();
  });
});

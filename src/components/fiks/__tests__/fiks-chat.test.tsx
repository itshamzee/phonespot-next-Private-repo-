import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// next/dynamic loads the panel asynchronously; in tests it is used directly.
vi.mock("next/dynamic", async () => {
  const mod = await import("../fiks-panel");
  return { default: () => mod.FiksPanel };
});

import { FiksChat } from "../fiks-chat";
import { FiksPanel, GREETING, STARTERS, linkify } from "../fiks-panel";
import { FIKS_TOKEN_KEY } from "../fiks-shared";

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  window.sessionStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("linkify", () => {
  it("links only https://phonespot.dk/ URLs and leaves trailing punctuation as text", () => {
    const { container } = render(<p>{linkify("Se https://phonespot.dk/reparation. Eller https://evil.example/x og http://phonespot.dk/a")}</p>);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("https://phonespot.dk/reparation");
    expect(links[0].getAttribute("target")).toBeNull();
    expect(container.textContent).toContain("https://evil.example/x");
  });

  it("renders markup as text, never as HTML", () => {
    const { container } = render(<p>{linkify('<img src=x onerror="alert(1)">')}</p>);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("FiksChat launcher", () => {
  it("shows the button, opens the panel and returns focus on close", async () => {
    render(<FiksChat />);
    const button = screen.getByRole("button", { name: "Åbn chat med Fiks" });
    expect(button.className).toContain("print:hidden");
    fireEvent.click(button);

    expect(await screen.findByText(GREETING)).toBeInTheDocument();
    expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Skriv til Fiks")));

    fireEvent.keyDown(screen.getByLabelText("Skriv til Fiks"), { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Åbn chat med Fiks" })));
  });

  it("hides itself for the page view when the API answers 503", async () => {
    window.sessionStorage.setItem(FIKS_TOKEN_KEY, "tok");
    fetchMock.mockImplementation(() => jsonResponse({ error: "lukket" }, 503));
    render(<FiksChat />);
    fireEvent.click(screen.getByRole("button", { name: "Åbn chat med Fiks" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Åbn chat med Fiks" })).toBeNull());
    expect(screen.queryByText(GREETING)).toBeNull();
  });
});

describe("FiksPanel", () => {
  it("sends a starter, stores the token and renders the reply with links", async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({ token: "t-1", reply: "Se priserne på https://phonespot.dk/reparation", handoff: false }),
    );
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: STARTERS[0] }));

    expect(await screen.findByRole("link", { name: "https://phonespot.dk/reparation" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(FIKS_TOKEN_KEY)).toBe("t-1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/fiks/chat");
    expect(JSON.parse(init.body)).toEqual({ message: STARTERS[0], website: "" });
  });

  it("sends on Enter, not on Shift+Enter, and sends the stored token", async () => {
    window.sessionStorage.setItem(FIKS_TOKEN_KEY, "t-9");
    fetchMock.mockImplementation((url: string) =>
      url.includes("?token=") ? jsonResponse({ messages: [] }) : jsonResponse({ token: "t-9", reply: "Hej.", handoff: false }),
    );
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    const box = screen.getByLabelText("Skriv til Fiks");
    fireEvent.change(box, { target: { value: "hej" } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(fetchMock.mock.calls.filter(([u]) => !String(u).includes("?token="))).toHaveLength(0);
    await act(async () => {
      fireEvent.keyDown(box, { key: "Enter" });
    });
    await screen.findByText("Hej.");
    const post = fetchMock.mock.calls.find(([u]) => !String(u).includes("?token="))!;
    expect(JSON.parse(post[1].body)).toMatchObject({ token: "t-9", message: "hej" });
  });

  it("restores an earlier conversation by token", async () => {
    window.sessionStorage.setItem(FIKS_TOKEN_KEY, "t-2");
    fetchMock.mockImplementation(() =>
      jsonResponse({ messages: [{ from: "visitor", body: "Hvornår har I åbent?", at: "x" }, { from: "fiks", body: "Fra kl. 10.", at: "y" }] }),
    );
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    expect(await screen.findByText("Fra kl. 10.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/fiks/chat?token=t-2");
    // Starters only show on an empty conversation.
    expect(screen.queryByRole("button", { name: STARTERS[1] })).toBeNull();
  });

  it("shows a fixed error text when sending fails", async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error("offline")));
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: STARTERS[2] }));
    expect(await screen.findByText(/Beskeden blev ikke sendt/)).toBeInTheDocument();
  });

  it("calls onDisabled on a 503 reply", async () => {
    const onDisabled = vi.fn();
    fetchMock.mockImplementation(() => jsonResponse({ error: "x" }, 503));
    render(<FiksPanel open onClose={vi.fn()} onDisabled={onDisabled} />);
    fireEvent.click(screen.getByRole("button", { name: STARTERS[0] }));
    await waitFor(() => expect(onDisabled).toHaveBeenCalled());
  });

  it("shows a sell card with the amount and a real link under the reply that carries an action", async () => {
    const href = "/saelg-din-enhed?model=iPhone+13&storage=128GB&fiks=t-1#start";
    fetchMock.mockImplementation(() =>
      jsonResponse({
        token: "t-1",
        reply: "Din iPhone 13 er vejledende 2.150 kr. værd.",
        handoff: false,
        action: { type: "sell", label: "Fortsæt til formularen", href, model: "iPhone 13", amount: 2150 },
      }),
    );
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: STARTERS[1] }));
    const link = await screen.findByRole("link", { name: "Fortsæt til formularen" });
    expect(link).toHaveAttribute("href", href);
    expect(screen.getByText("Vejledende pris")).toBeInTheDocument();
    expect(screen.getByText("2.150 kr.")).toBeInTheDocument();
    expect(screen.getByText("Den endelige pris afhænger af vores tjek af enheden.")).toBeInTheDocument();
  });

  it("ignores an action that does not point to the sell form", async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        token: "t-1",
        reply: "Hej.",
        action: { type: "sell", label: "Fortsæt til formularen", href: "https://evil.example/x", model: "iPhone 13", amount: 2150 },
      }),
    );
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: STARTERS[1] }));
    await screen.findByText("Hej.");
    expect(screen.queryByRole("link", { name: "Fortsæt til formularen" })).toBeNull();
  });

  it("restores the sell card under Fiks' latest reply after a reload", async () => {
    window.sessionStorage.setItem(FIKS_TOKEN_KEY, "t-3");
    fetchMock.mockImplementation(() =>
      jsonResponse({
        messages: [
          { from: "visitor", body: "Hvad er min iPhone værd?", at: "a" },
          { from: "fiks", body: "Vejledende 1.850 kr.", at: "b" },
        ],
        action: { type: "sell", label: "Fortsæt til formularen", href: "/saelg-din-enhed?fiks=t-3#start", model: "iPhone 12", amount: 1850 },
      }),
    );
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    expect(await screen.findByRole("link", { name: "Fortsæt til formularen" })).toHaveAttribute("href", "/saelg-din-enhed?fiks=t-3#start");
    expect(screen.getByText("1.850 kr.")).toBeInTheDocument();
  });

  it("offers a fourth starter for choosing a phone", () => {
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    expect(STARTERS).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Hjælp mig med at vælge en telefon" })).toBeInTheDocument();
  });

  it("renders product cards under the reply as same-tab links with image, stand and price", async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        token: "t-1",
        reply: "iPhone 13 passer til dit budget. Kortene herunder viser pris og stand.",
        products: [
          {
            name: "iPhone 13",
            url: "https://phonespot.dk/refurbished/iphone-13?grade=B",
            image: "https://x.supabase.co/a.webp",
            priceFrom: 3499,
            grade: "B",
            gradeLabel: "Stand B · God stand",
            storage: "128GB",
            inStore: "Vejle",
          },
          { name: "iPhone 12", url: "/refurbished/iphone-12", image: null, priceFrom: 2499 },
        ],
      }),
    );
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: STARTERS[3] }));

    const list = await screen.findByRole("list", { name: "Enheder på lager" });
    const links = list.querySelectorAll("a");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "https://phonespot.dk/refurbished/iphone-13?grade=B");
    expect(links[0].getAttribute("target")).toBeNull();
    expect(links[1]).toHaveAttribute("href", "/refurbished/iphone-12");
    const img = screen.getByRole("img", { name: "iPhone 13" });
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("width", "64");
    expect(screen.getByText("Stand B · God stand · 128GB")).toBeInTheDocument();
    expect(screen.getByText("3.499 kr.")).toBeInTheDocument();
    expect(screen.getByText("Kan ses i Vejle")).toBeInTheDocument();
    expect(screen.getByText("Intet billede")).toBeInTheDocument();
  });

  it("renders no card for an unsafe product URL", async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        token: "t-1",
        reply: "Her er et forslag.",
        products: [
          { name: "Ond", url: "https://evil.example/x", image: null, priceFrom: 100 },
          { name: "Protokol", url: "//evil.example/x", image: null, priceFrom: 100 },
          { name: "Script", url: "javascript:alert(1)", image: null, priceFrom: 100 },
          { name: "God", url: "https://phonespot.dk/refurbished/ok", image: "javascript:alert(1)", priceFrom: 100 },
        ],
      }),
    );
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: STARTERS[3] }));
    await screen.findByText("Her er et forslag.");
    const list = screen.getByRole("list", { name: "Enheder på lager" });
    expect(list.querySelectorAll("a")).toHaveLength(1);
    expect(screen.queryByText("Ond")).toBeNull();
    expect(screen.queryByText("Script")).toBeNull();
    // The unsafe image is dropped, not rendered.
    expect(list.querySelector("img")).toBeNull();
  });

  it("restores product cards under Fiks' latest reply", async () => {
    window.sessionStorage.setItem(FIKS_TOKEN_KEY, "t-4");
    fetchMock.mockImplementation(() =>
      jsonResponse({
        messages: [
          { from: "visitor", body: "iPhone?", at: "a" },
          { from: "fiks", body: "Her er iPhone 12.", at: "b" },
        ],
        products: [{ name: "iPhone 12", url: "https://phonespot.dk/refurbished/iphone-12", image: null, priceFrom: 2499 }],
      }),
    );
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    expect(await screen.findByRole("link", { name: /iPhone 12/ })).toHaveAttribute("href", "https://phonespot.dk/refurbished/iphone-12");
  });

  it("shows a typing indicator while waiting", async () => {
    let resolve: (v: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (resolve = r)));
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: STARTERS[0] }));
    expect(await screen.findByText("Fiks skriver…")).toBeInTheDocument();
    await act(async () => {
      resolve(new Response(JSON.stringify({ token: "t", reply: "Hvilken model?" }), { status: 200 }));
    });
    expect(await screen.findByText("Hvilken model?")).toBeInTheDocument();
    expect(screen.queryByText("Fiks skriver…")).toBeNull();
  });

  it("links to the privacy section and warns about CPR and card details", () => {
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Privatlivspolitik" })).toHaveAttribute("href", "/privatlivspolitik#chat");
    expect(screen.getByText(/Skriv ikke CPR-nummer eller kortoplysninger/)).toBeInTheDocument();
  });
});

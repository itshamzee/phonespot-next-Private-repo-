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

  it("links to the privacy section and warns about CPR and card details", () => {
    render(<FiksPanel open onClose={vi.fn()} onDisabled={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Privatlivspolitik" })).toHaveAttribute("href", "/privatlivspolitik#chat");
    expect(screen.getByText(/Skriv ikke CPR-nummer eller kortoplysninger/)).toBeInTheDocument();
  });
});

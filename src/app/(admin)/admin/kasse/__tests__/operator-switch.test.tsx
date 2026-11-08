import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

const LOC = "00000000-0000-4000-8000-000000000030";
const MADS = "00000000-0000-4000-8000-000000000041";
const LISE = "00000000-0000-4000-8000-000000000042";

const net = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("@/lib/pos/client", () => ({
  posFetch: (url: string, init?: RequestInit) => net.fetch(url, init),
}));

import { OperatorSwitch } from "../_components/operator-switch";

function json(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

let postResponse: { status: number; body: unknown };

beforeEach(() => {
  postResponse = { status: 200, body: { current: { id: MADS, name: "Mads" } } };
  net.fetch.mockReset();
  net.fetch.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/api/admin/me") return json(200, { id: LISE, name: "Lise" });
    if (url.startsWith("/api/pos/operator") && (!init?.method || init.method === "GET")) {
      return json(200, {
        current: { id: LISE, name: "Lise" },
        staff: [
          { id: MADS, name: "Mads", hasPin: true },
          { id: LISE, name: "Lise", hasPin: true },
          { id: "x", name: "Ny Medarbejder", hasPin: false },
        ],
      });
    }
    if (url === "/api/pos/operator" && init?.method === "POST") return json(postResponse.status, postResponse.body);
    return json(200, {});
  });
});

afterEach(cleanup);

async function openAndPick(name: string) {
  fireEvent.click(await screen.findByRole("button", { name: /Ekspedient: Lise/ }));
  fireEvent.click(await screen.findByRole("button", { name }));
}

function typePin(code: string) {
  for (const ch of code) fireEvent.keyDown(window, { key: ch });
}

describe("OperatorSwitch", () => {
  it("skifter ekspedient med pinkode og Enter", async () => {
    const onChanged = vi.fn();
    render(<OperatorSwitch locationId={LOC} onChanged={onChanged} />);
    await openAndPick("Mads");
    typePin("1234");
    fireEvent.keyDown(window, { key: "Enter" });

    await waitFor(() => expect(screen.getByRole("button", { name: "Ekspedient: Mads" })).toBeTruthy());
    const post = net.fetch.mock.calls.find((c) => c[0] === "/api/pos/operator" && c[1]?.method === "POST");
    expect(JSON.parse(post![1].body)).toEqual({ staffId: MADS, pin: "1234", locationId: LOC });
    expect(onChanged).toHaveBeenCalledWith({ id: MADS, name: "Mads" });
  });

  it("viser Forkert pinkode ved 401 og tømmer feltet", async () => {
    postResponse = { status: 401, body: { error: "Forkert pinkode" } };
    render(<OperatorSwitch locationId={LOC} onChanged={vi.fn()} />);
    await openAndPick("Mads");
    typePin("9999");
    fireEvent.keyDown(window, { key: "Enter" });

    expect((await screen.findByRole("alert")).textContent).toBe("Forkert pinkode");
    expect(screen.getByText("Tast pinkode")).toBeTruthy();
    expect((screen.getByRole("button", { name: "OK" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("viser låsebeskeden ved 423 og slår tastaturet fra", async () => {
    postResponse = { status: 423, body: { error: "Pinkoden er låst i 15 minutter" } };
    render(<OperatorSwitch locationId={LOC} onChanged={vi.fn()} />);
    await openAndPick("Mads");
    typePin("1234");
    fireEvent.keyDown(window, { key: "Enter" });

    expect((await screen.findByRole("alert")).textContent).toBe("Pinkoden er låst i 15 minutter");
    await waitFor(() => expect((screen.getByRole("button", { name: "5" }) as HTMLButtonElement).disabled).toBe(true));
    typePin("1234");
    await waitFor(() => expect(screen.getByText("Tast pinkode")).toBeTruthy());
  });

  it("markerer medarbejdere uden pinkode og kan gå tilbage til den loggede ind bruger", async () => {
    const onChanged = vi.fn();
    postResponse = { status: 200, body: { current: { id: MADS, name: "Mads" } } };
    render(<OperatorSwitch locationId={LOC} onChanged={onChanged} />);
    await openAndPick("Mads");
    typePin("1234");
    fireEvent.keyDown(window, { key: "Enter" });
    await screen.findByRole("button", { name: "Ekspedient: Mads" });

    fireEvent.click(screen.getByRole("button", { name: "Ekspedient: Mads" }));
    expect(screen.getByText("Ingen pinkode")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Ny Medarbejder/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Tilbage til Lise" }));
    await waitFor(() => expect(net.fetch.mock.calls.some((c) => c[1]?.method === "DELETE")).toBe(true));
  });

  it("kalder onChanged efter DELETE selv om opslaget bagefter giver 403", async () => {
    const onChanged = vi.fn();
    render(<OperatorSwitch locationId={LOC} onChanged={onChanged} />);
    await openAndPick("Mads");
    typePin("1234");
    fireEvent.keyDown(window, { key: "Enter" });
    await screen.findByRole("button", { name: "Ekspedient: Mads" });
    onChanged.mockClear();

    const base = net.fetch.getMockImplementation()!;
    net.fetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return json(200, { ok: true });
      if (url.startsWith("/api/pos/operator") && (!init?.method || init.method === "GET")) return json(403, {});
      return base(url, init);
    });
    fireEvent.click(screen.getByRole("button", { name: "Ekspedient: Mads" }));
    fireEvent.click(screen.getByRole("button", { name: "Tilbage til Lise" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("sammenligner på id: samme navn, andet id viser Tilbage til", async () => {
    net.fetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/admin/me") return json(200, { id: LISE, name: "Lise" });
      if (url.startsWith("/api/pos/operator") && (!init?.method || init.method === "GET")) {
        return json(200, { current: { id: MADS, name: "Lise" }, staff: [{ id: MADS, name: "Lise", hasPin: true }] });
      }
      return json(200, {});
    });
    render(<OperatorSwitch locationId={LOC} onChanged={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Ekspedient: Lise/ }));
    expect(await screen.findByRole("button", { name: "Tilbage til Lise" })).toBeTruthy();
  });

  it("viser Tilbage når den loggede ind brugers navn er ukendt", async () => {
    net.fetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/admin/me") return json(200, { id: LISE });
      if (url.startsWith("/api/pos/operator") && (!init?.method || init.method === "GET")) {
        return json(200, { current: { id: MADS, name: "Mads" }, staff: [{ id: MADS, name: "Mads", hasPin: true }] });
      }
      return json(200, {});
    });
    render(<OperatorSwitch locationId={LOC} onChanged={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Ekspedient: Mads/ }));
    expect(await screen.findByRole("button", { name: "Tilbage" })).toBeTruthy();
  });
});

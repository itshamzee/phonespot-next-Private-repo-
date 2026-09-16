import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Registration from "../page";

vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));

function fill() {
  for (const [label, value] of [["Firmanavn", " Kontor ApS "], ["CVR-nummer", "12345678"], ["Kontaktperson", " Anne Jensen "], ["E-mail", "anne@example.com"], ["Adgangskode", "example-password"], ["Bekræft adgangskode", "example-password"]]) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }
}
const submit = () => fireEvent.submit(screen.getByRole("form", { name: "Ansøgning om erhvervskonto" }));
beforeEach(() => vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected request"))));
afterEach(() => vi.unstubAllGlobals());

describe("reseller registration", () => {
  it("keeps the registration API contract and only confirms an application", async () => {
    const send = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", send);
    render(<Registration />); fill();
    expect(screen.getByRole("form")).toBeValid();
    fireEvent.click(screen.getByRole("button", { name: "Ansøg om erhvervskonto" }));
    expect(await screen.findByRole("status")).toHaveTextContent("kontakter jer om godkendelsen");
    const [url, request] = send.mock.calls[0];
    expect(url).toBe("/api/b2b/register");
    expect(JSON.parse(request.body)).toEqual({ companyName: "Kontor ApS", cvrNummer: "12345678", contactName: "Anne Jensen", email: "anne@example.com", password: "example-password" });
    await waitFor(() => expect(screen.getByRole("status")).toHaveFocus());
    expect(screen.queryByRole("button", { name: "Ansøg om erhvervskonto" })).not.toBeInTheDocument();
  });

  it("rejects missing information and mismatched passwords without sending", async () => {
    render(<Registration />); submit();
    expect(screen.getByRole("alert")).toHaveTextContent("Udfyld firmanavn");
    fill();
    fireEvent.change(screen.getByLabelText("Bekræft adgangskode", { exact: true }), { target: { value: "different-password" } });
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent("stemmer ikke overens");
    act(() => screen.getByLabelText("Bekræft adgangskode", { exact: true }).focus());
    submit();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["server", "network"])("preserves fields after a %s error and allows retry", async failure => {
    const send = vi.fn();
    if (failure === "network") send.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    else send.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Prøv igen senere." }), { status: 500 }));
    send.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", send);
    render(<Registration />); fill(); submit();
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Firmanavn")).toHaveValue(" Kontor ApS ");
    expect(screen.getByLabelText("Adgangskode", { exact: true })).toHaveValue("example-password");
    expect(screen.getByRole("button", { name: "Ansøg om erhvervskonto" })).toBeEnabled();
    submit();
    await screen.findByRole("status");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("sends only once while a request is pending", async () => {
    let resolve!: (response: Response) => void;
    const send = vi.fn().mockReturnValue(new Promise<Response>(r => { resolve = r; }));
    vi.stubGlobal("fetch", send);
    render(<Registration />); fill();
    act(() => { submit(); submit(); });
    expect(send).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sender ansøgning…" })).toBeDisabled();
    await act(async () => resolve(new Response(JSON.stringify({ success: true }), { status: 200 })));
    await waitFor(() => expect(screen.getByRole("status")).toHaveFocus());
  });
});

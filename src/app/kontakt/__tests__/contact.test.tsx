import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import ContactPage from "../page";

const request = vi.fn();
beforeEach(() => vi.stubGlobal("fetch", request));
afterEach(() => { cleanup(); request.mockReset(); vi.unstubAllGlobals(); });

function fillForm(store = "Vejle") {
  fireEvent.change(screen.getByLabelText(/Navn/), { target: { value: "Anna Hansen" } });
  fireEvent.change(screen.getByLabelText(/E-mail/), { target: { value: "anna@example.com" } });
  fireEvent.change(screen.getByLabelText(/Butik/), { target: { value: store } });
  fireEvent.change(screen.getByLabelText(/Besked/), { target: { value: "Jeg har et spørgsmål til min enhed." } });
}

it.each([["Vejle", "vejle"], ["Slagelse", "slagelse"]])("sends the existing payload with normalized %s and resets after success", async (store, storeId) => {
  request.mockResolvedValue({ ok: true });
  render(<ContactPage />);
  fillForm(store);
  fireEvent.click(screen.getByRole("button", { name: "Send besked" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Tak for din besked");
  expect(request).toHaveBeenCalledWith("/api/contact", expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "Anna Hansen", email: "anna@example.com", subject: "Support", message: "Jeg har et spørgsmål til min enhed.", store_id: storeId }) }));
  fireEvent.click(screen.getByRole("button", { name: "Send en ny besked" }));
  expect(screen.getByLabelText(/Navn/)).toHaveValue("");
});

it.each(["network", "http"])("keeps all inputs and allows retry after a %s error", async (failure) => {
  if (failure === "network") request.mockRejectedValueOnce(new Error("Failed to fetch"));
  else request.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Upstream error" }) });
  request.mockResolvedValueOnce({ ok: true });
  render(<ContactPage />);
  fillForm();
  fireEvent.click(screen.getByRole("button", { name: "Send besked" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Beskeden kunne ikke sendes");
  expect(screen.getByLabelText(/Navn/)).toHaveValue("Anna Hansen");
  expect(screen.getByLabelText(/E-mail/)).toHaveValue("anna@example.com");
  expect(screen.getByLabelText(/Butik/)).toHaveValue("Vejle");
  expect(screen.getByLabelText(/Besked/)).toHaveValue("Jeg har et spørgsmål til min enhed.");
  fireEvent.click(screen.getByRole("button", { name: "Send besked" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Tak for din besked");
});

it("prevents duplicate submissions while sending", async () => {
  let resolve!: (value: { ok: boolean }) => void;
  request.mockReturnValue(new Promise((r) => { resolve = r; }));
  const { container } = render(<ContactPage />);
  fillForm();
  const form = container.querySelector("form")!;
  act(() => { fireEvent.submit(form); fireEvent.submit(form); });
  expect(request).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Sender..." })).toBeDisabled();
  await act(async () => resolve({ ok: true }));
});

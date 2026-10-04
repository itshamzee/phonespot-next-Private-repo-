import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { caseListKeyAction, useCaseListKeys, type ListKeyAction } from "../list-keys";
import { MeldKlarDialog, meldKlarBody, type MeldKlarTarget } from "../meld-klar-dialog";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ids = ["a", "b", "c"];

describe("caseListKeyAction", () => {
  it("arrows move the selection and stop at the ends", () => {
    expect(caseListKeyAction({ key: "ArrowDown" }, ids, null)).toEqual({ type: "select", id: "a" });
    expect(caseListKeyAction({ key: "ArrowDown" }, ids, "a")).toEqual({ type: "select", id: "b" });
    expect(caseListKeyAction({ key: "ArrowDown" }, ids, "c")).toEqual({ type: "select", id: "c" });
    expect(caseListKeyAction({ key: "ArrowUp" }, ids, "b")).toEqual({ type: "select", id: "a" });
    expect(caseListKeyAction({ key: "ArrowUp" }, ids, "a")).toEqual({ type: "select", id: "a" });
  });
  it("Enter opens and K melds klar the selected case", () => {
    expect(caseListKeyAction({ key: "Enter" }, ids, "b")).toEqual({ type: "open", id: "b" });
    expect(caseListKeyAction({ key: "k" }, ids, "b")).toEqual({ type: "ready", id: "b" });
    expect(caseListKeyAction({ key: "K" }, ids, null)).toBeNull();
  });
  it("ignores typing in fields, Enter on buttons and modifier combos", () => {
    expect(caseListKeyAction({ key: "k", targetTag: "INPUT" }, ids, "b")).toBeNull();
    expect(caseListKeyAction({ key: "ArrowDown", targetTag: "TEXTAREA" }, ids, "a")).toBeNull();
    expect(caseListKeyAction({ key: "Enter", targetTag: "BUTTON" }, ids, "b")).toBeNull();
    expect(caseListKeyAction({ key: "k", ctrlKey: true }, ids, "b")).toBeNull();
  });
});

function Harness({ enabled = true, onAction }: { enabled?: boolean; onAction: (a: ListKeyAction) => void }) {
  useCaseListKeys({ enabled, ids, selectedId: "b", onAction });
  return <input aria-label="Søg" />;
}

describe("useCaseListKeys", () => {
  it("dispatches window key presses, but not while typing or disabled", () => {
    const onAction = vi.fn();
    const { rerender } = render(<Harness onAction={onAction} />);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(onAction).toHaveBeenCalledWith({ type: "select", id: "c" });
    fireEvent.keyDown(window, { key: "k" });
    expect(onAction).toHaveBeenLastCalledWith({ type: "ready", id: "b" });

    onAction.mockClear();
    fireEvent.keyDown(screen.getByLabelText("Søg"), { key: "k" });
    expect(onAction).not.toHaveBeenCalled();

    rerender(<Harness enabled={false} onAction={onAction} />);
    fireEvent.keyDown(window, { key: "k" });
    expect(onAction).not.toHaveBeenCalled();
  });
});

const target: MeldKlarTarget = {
  id: "t1",
  label: "PS-2026-0042",
  status: "i_gang",
  customer_name: "Anna",
  customer_phone: "20123456",
  paid: false,
};

describe("meldKlarBody", () => {
  it("maps choices to status route bodies", () => {
    expect(meldKlarBody("klar", false)).toEqual({ status: "faerdig" });
    expect(meldKlarBody("klar", true)).toEqual({ status: "faerdig", skip_sms: true });
    expect(meldKlarBody("betalt", true)).toEqual({ status: "afhentet" });
  });
});

describe("MeldKlarDialog", () => {
  it("sends faerdig with SMS by default", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    const onDone = vi.fn();
    render(<MeldKlarDialog target={target} onClose={() => {}} onDone={onDone} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Meld klar" }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/repairs/t1/status");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ status: "faerdig" });
  });

  it("can skip the SMS", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    render(<MeldKlarDialog target={target} onClose={() => {}} onDone={() => {}} />);
    fireEvent.click(screen.getByLabelText(/Send ikke afhentnings-SMS/));
    fireEvent.click(screen.getByRole("button", { name: "Meld klar" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ status: "faerdig", skip_sms: true });
  });

  it("Faerdig og betalt needs a payment confirmation when the case is unpaid", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    render(<MeldKlarDialog target={target} onClose={() => {}} onDone={() => {}} />);
    fireEvent.click(screen.getByLabelText(/Færdig og betalt/));
    const submit = screen.getByRole("button", { name: "Afslut sagen" });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/betalingen er modtaget/));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ status: "afhentet" });
  });

  it("shows the server error and stays open", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "Ugyldig status" }), { status: 400 }));
    const onDone = vi.fn();
    render(<MeldKlarDialog target={target} onClose={() => {}} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "Meld klar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ugyldig status");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("Escape closes the dialog", () => {
    const onClose = vi.fn();
    render(<MeldKlarDialog target={target} onClose={onClose} onDone={() => {}} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

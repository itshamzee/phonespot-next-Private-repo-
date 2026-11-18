import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider, useToast } from "../toast";

function Trigger({ message, tone }: { message: string; tone?: "neutral" | "error" }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast(message, { tone })}>
      {`vis ${message}`}
    </button>
  );
}

function setup() {
  return render(
    <ToastProvider>
      <Trigger message="Gemt" />
      <Trigger message="Sendt" />
      <Trigger message="Kunne ikke gemme" tone="error" />
    </ToastProvider>,
  );
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Toast", () => {
  it("viser beskeden som status og lukker efter 4 sekunder", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "vis Gemt" }));
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Gemt");
    expect(status).toHaveAttribute("data-open", "true");

    advance(3999);
    expect(status).toHaveAttribute("data-open", "true");
    advance(1);
    expect(status).toHaveAttribute("data-open", "false");
    // Teksten står, mens toasten toner ud, og forsvinder bagefter.
    expect(status).toHaveTextContent("Gemt");
    advance(220);
    expect(status).toHaveTextContent("");
  });

  it("en fejl har role alert og bliver stående i 8 sekunder", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "vis Kunne ikke gemme" }));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Kunne ikke gemme");
    expect(alert).toHaveAttribute("data-open", "true");
    expect(screen.getByRole("status")).toHaveAttribute("data-open", "false");
    advance(4000);
    expect(alert).toHaveAttribute("data-open", "true");
    advance(4000);
    expect(alert).toHaveAttribute("data-open", "false");
  });

  it("viser én ad gangen og sætter den næste i kø", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "vis Gemt" }));
    fireEvent.click(screen.getByRole("button", { name: "vis Sendt" }));
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Gemt");
    expect(status).not.toHaveTextContent("Sendt");

    advance(4000 + 220);
    expect(status).toHaveTextContent("Sendt");
    expect(status).toHaveAttribute("data-open", "true");
    advance(4000 + 220);
    expect(status).toHaveTextContent("");
  });

  it("useToast uden ToastProvider fejler tydeligt", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger message="x" />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});

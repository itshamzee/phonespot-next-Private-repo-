import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NewBookingToast, type LatestWebBooking } from "../new-booking-toast";

const booking: LatestWebBooking = {
  id: "b1",
  device: "iPhone 15",
  store: "vejle",
  date: null,
  time: null,
  createdAt: "2026-11-18T10:00:00.000Z",
};

beforeEach(() => {
  window.localStorage.setItem("phonespot_admin_last_seen_booking", "2026-11-18T09:00:00.000Z");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("NewBookingToast", () => {
  it("er monteret og lukket, før der kommer en booking", () => {
    render(<NewBookingToast latest={undefined} />);
    const toast = screen.getByRole("status");
    expect(toast).toHaveAttribute("data-open", "false");
    expect(toast).toHaveClass("m-toast");
    expect(toast.className).not.toMatch(/shadow/);
  });

  it("toner ind ved en ny booking og ud igen, med teksten stående mens den toner ud", () => {
    const { rerender } = render(<NewBookingToast latest={null} />);
    rerender(<NewBookingToast latest={booking} />);
    const toast = screen.getByRole("status");
    expect(toast).toHaveAttribute("data-open", "true");
    expect(toast).toHaveTextContent("Ny reparationsanmodning");

    fireEvent.click(screen.getByRole("button", { name: "Luk" }));
    expect(toast).toHaveAttribute("data-open", "false");
    expect(toast).toHaveTextContent("iPhone 15");
  });

  it("lukker af sig selv efter 15 sekunder", () => {
    vi.useFakeTimers();
    const { rerender } = render(<NewBookingToast latest={null} />);
    rerender(<NewBookingToast latest={booking} />);
    act(() => vi.advanceTimersByTime(15_000));
    expect(screen.getByRole("status", { hidden: true })).toHaveAttribute("data-open", "false");
  });
});

import { describe, expect, it, vi } from "vitest";
import { formatKr, formatWhen, summarizeLines } from "../format";
import { TransferError, transferError } from "../errors";

describe("formatWhen", () => {
  const now = new Date(2026, 9, 4, 12, 0);
  it("says i dag / i går / date", () => {
    expect(formatWhen(new Date(2026, 9, 4, 11, 20).toISOString(), now)).toBe("i dag 11.20");
    expect(formatWhen(new Date(2026, 9, 3, 16, 5).toISOString(), now)).toBe("i går 16.05");
    expect(formatWhen(new Date(2026, 8, 30, 9, 0).toISOString(), now)).toBe("30. sep.");
    expect(formatWhen(null, now)).toBe("");
    expect(formatWhen("not a date", now)).toBe("");
  });
});

describe("summarizeLines", () => {
  it("shows quantity and counts the rest", () => {
    expect(summarizeLines([{ description: "USB-C kabel 1 m", qty: 2, sentQty: 0 }])).toBe("2× USB-C kabel 1 m");
    expect(summarizeLines([{ description: "iPhone 14 Pro", qty: 1, sentQty: 1 }])).toBe("iPhone 14 Pro");
    expect(
      summarizeLines([
        { description: "A", qty: 1, sentQty: 0 },
        { description: "B", qty: 1, sentQty: 0 },
        { description: "C", qty: 1, sentQty: 0 },
      ]),
    ).toBe("A + 2 andre varer");
    expect(summarizeLines([])).toBe("Ingen varer");
  });
  it("prefers the sent quantity once sent", () => {
    expect(summarizeLines([{ description: "Kabel", qty: 5, sentQty: 3 }])).toBe("3× Kabel");
  });
});

describe("formatKr", () => {
  it("formats oere as whole Danish kroner", () => {
    expect(formatKr(310000).replace(/ /g, " ")).toBe("3.100 kr.");
    expect(formatKr(null)).toBe("–");
  });
});

describe("transferError", () => {
  it("translates transfer:<code>:<detail> messages", () => {
    const e = transferError("x", { message: "transfer:insufficient_stock:USB-C kabel", code: "PS002" });
    expect(e).toBeInstanceOf(TransferError);
    expect(e.status).toBe(409);
    expect(e.message).toContain("USB-C kabel");
    expect(transferError("x", { message: "transfer:already_received" }).code).toBe("already_received");
    expect(transferError("x", { message: "transfer:forbidden_location" }).status).toBe(403);
  });

  it("hides unknown database errors behind the fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const e = transferError("Noget gik galt", { message: 'duplicate key value violates unique constraint "x"' });
    expect(e.status).toBe(500);
    expect(e.message).toBe("Noget gik galt");
    spy.mockRestore();
  });
});

import { describe, it, expect } from "vitest";
import { INITIAL_CHECKLIST, allNormal } from "../intake-checklist";
import { ticketLabel } from "../ticket-label";

describe("intake checklist", () => {
  it("starts with nothing assessed, never OK", () => {
    expect(INITIAL_CHECKLIST.length).toBeGreaterThan(0);
    expect(INITIAL_CHECKLIST.every((i) => i.status === "ikke_vurderet")).toBe(true);
  });

  it("Alt som normalt sets every item to OK without touching notes or the original", () => {
    const withNote = INITIAL_CHECKLIST.map((i, n) => (n === 0 ? { ...i, note: "lille ridse" } : i));
    const result = allNormal(withNote);
    expect(result.every((i) => i.status === "ok")).toBe(true);
    expect(result[0].note).toBe("lille ridse");
    expect(withNote[1].status).toBe("ikke_vurderet");
  });
});

describe("ticketLabel", () => {
  it("prefers the ticket number and falls back to the short id", () => {
    expect(ticketLabel({ id: "abcdef12-0000", ticket_number: "PS-2026-0001" })).toBe("PS-2026-0001");
    expect(ticketLabel({ id: "abcdef12-0000", ticket_number: null })).toBe("abcdef12");
    expect(ticketLabel({ id: "abcdef12-0000", ticket_number: " " })).toBe("abcdef12");
  });
});

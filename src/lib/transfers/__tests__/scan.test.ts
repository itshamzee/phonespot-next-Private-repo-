import { describe, expect, it } from "vitest";
import { applyScan, missingAfter, normalizeCode, pendingToPayload, setPending, type ScanLine } from "../scan";

const device: ScanLine = {
  id: "d1",
  description: "iPhone 14 Pro 128 GB · Grade A",
  deviceId: "dev-1",
  sentQty: 1,
  receivedQty: 0,
  returnedQty: 0,
  codes: ["353456789012345", "PS-000123"],
};
const cable: ScanLine = {
  id: "s1",
  description: "USB-C kabel 1 m",
  deviceId: null,
  sentQty: 3,
  receivedQty: 1,
  returnedQty: 0,
  codes: ["5700000000017"],
};
const lines = [device, cable];

describe("applyScan", () => {
  it("matches an IMEI regardless of spaces and dashes", () => {
    expect(normalizeCode(" 35-3456 789012 345 ")).toBe("353456789012345");
    const r = applyScan("35 3456 789012 345", lines, {});
    expect(r).toMatchObject({ ok: true, lineId: "d1", pending: { d1: 1 } });
  });

  it("matches a barcode case-insensitively", () => {
    expect(applyScan("ps-000123", lines, {})).toMatchObject({ ok: true, lineId: "d1" });
  });

  it("a device can only be scanned once", () => {
    const first = applyScan("353456789012345", lines, {});
    expect(first.ok).toBe(true);
    const second = applyScan("353456789012345", lines, first.pending);
    expect(second).toMatchObject({ ok: false, reason: "already_scanned" });
  });

  it("accessories count one per scan, up to what is still on the way", () => {
    let pending = {};
    for (let i = 0; i < 2; i++) {
      const r = applyScan("5700000000017", lines, pending);
      expect(r.ok).toBe(true);
      pending = r.pending;
    }
    expect(pending).toEqual({ s1: 2 }); // sent 3, 1 already received -> 2 open
    expect(applyScan("5700000000017", lines, pending)).toMatchObject({ ok: false, reason: "already_scanned" });
  });

  it("rejects codes that are not on the transfer", () => {
    expect(applyScan("999", lines, {})).toMatchObject({ ok: false, reason: "unknown" });
    expect(applyScan("   ", lines, {})).toMatchObject({ ok: false, reason: "unknown" });
  });
});

describe("pending helpers", () => {
  it("setPending clamps between 0 and what remains", () => {
    expect(setPending(cable, {}, 10)).toEqual({ s1: 2 });
    expect(setPending(cable, { s1: 2 }, -3)).toEqual({});
  });

  it("serialises only positive quantities", () => {
    expect(pendingToPayload({ a: 2, b: 0 })).toEqual([{ lineId: "a", qty: 2 }]);
  });

  it("counts what is still missing after the scans", () => {
    expect(missingAfter(lines, {})).toBe(3); // device 1 + cables 2
    expect(missingAfter(lines, { d1: 1, s1: 2 })).toBe(0);
    expect(missingAfter(lines, { d1: 1 })).toBe(2);
  });
});

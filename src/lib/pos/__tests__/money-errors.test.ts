import { describe, it, expect } from "vitest";
import { oereToInput, parseKr } from "../money";
import { PosError, rpcError, toPosError } from "../errors";

describe("parseKr", () => {
  it("parses Danish and plain decimals", () => {
    expect(parseKr("1234,50")).toBe(123450);
    expect(parseKr("1.234,50")).toBe(123450);
    expect(parseKr("1234.5")).toBe(123450);
    expect(parseKr("1.234")).toBe(123400);
    expect(parseKr("99")).toBe(9900);
    expect(parseKr(" 0,05 ")).toBe(5);
  });
  it("returns null for empty or invalid input", () => {
    expect(parseKr("")).toBeNull();
    expect(parseKr("abc")).toBeNull();
    expect(parseKr("1,234")).toBeNull();
  });
  it("round-trips through oereToInput", () => {
    expect(oereToInput(123450)).toBe("1234,50");
    expect(parseKr(oereToInput(5))).toBe(5);
  });
});

describe("toPosError", () => {
  it("maps pos:<code>:<detail> messages from Postgres to Danish text and status", () => {
    const e = toPosError({ message: "pos:device_unavailable:PSP-2026-00042" });
    expect(e).toBeInstanceOf(PosError);
    expect(e?.code).toBe("device_unavailable");
    expect(e?.status).toBe(409);
    expect(e?.message).toContain("PSP-2026-00042");
  });
  it("returns null for unrelated errors and keeps them as plain errors in rpcError", () => {
    expect(toPosError({ message: "connection refused" })).toBeNull();
    expect(rpcError("x", { message: "connection refused" })).not.toBeInstanceOf(PosError);
    expect(rpcError("x", { message: "pos:no_open_session" })).toBeInstanceOf(PosError);
  });
});

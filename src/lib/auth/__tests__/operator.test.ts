// @vitest-environment node
import { describe, expect, it } from "vitest";
import { OPERATOR_COOKIE, OPERATOR_TTL_MS, readOperator, signOperator } from "../operator";

const t = 1_780_000_000_000;
const k = "test-secret";

describe("operator cookie", () => {
  it("has the agreed name and a 12 hour lifetime", () => {
    expect(OPERATOR_COOKIE).toBe("ps_operator");
    expect(OPERATOR_TTL_MS).toBe(12 * 60 * 60 * 1000);
  });
  it("reads back the staff id and the login it was issued under until just before expiry", () => {
    expect(readOperator(signOperator("s1", "u1", t, k), t + OPERATOR_TTL_MS - 1, k)).toEqual({
      staffId: "s1",
      loggedInId: "u1",
    });
  });
  it("returns null after expiry", () => {
    expect(readOperator(signOperator("s1", "u1", t, k), t + OPERATOR_TTL_MS + 1, k)).toBeNull();
  });
  it("returns null with another secret", () => {
    expect(readOperator(signOperator("s1", "u1", t, k), t + 1, "other")).toBeNull();
  });
  it("returns null for a tampered staff id, login or timestamp", () => {
    const [, , issued, sig] = signOperator("s1", "u1", t, k).split(".");
    expect(readOperator(`s2.u1.${issued}.${sig}`, t + 1, k)).toBeNull();
    expect(readOperator(`s1.u2.${issued}.${sig}`, t + 1, k)).toBeNull();
    expect(readOperator(`s1.u1.${t + 1000}.${sig}`, t + 2000, k)).toBeNull();
  });
  it("returns null for missing or malformed values", () => {
    expect(readOperator(undefined, t, k)).toBeNull();
    expect(readOperator("", t, k)).toBeNull();
    expect(readOperator("garbage", t, k)).toBeNull();
    expect(readOperator("a.b.c", t, k)).toBeNull();
    expect(readOperator("a.b.c.d.e", t, k)).toBeNull();
  });
  it("returns null for a cookie issued in the future", () => {
    expect(readOperator(signOperator("s1", "u1", t + 10 * 60_000, k), t, k)).toBeNull();
  });
});

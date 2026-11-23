// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hashPin, isValidPin, verifyPin } from "../pin";

describe("isValidPin", () => {
  it("accepts 4 to 6 digits", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("123456")).toBe(true);
  });
  it("rejects too short, too long and non-digits", () => {
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
    expect(isValidPin("1234567")).toBe(false);
    expect(isValidPin(" 1234")).toBe(false);
  });
});

describe("hashPin / verifyPin", () => {
  it("verifies the right pin and rejects a wrong one", () => {
    const stored = hashPin("1234");
    expect(verifyPin("1234", stored)).toBe(true);
    expect(verifyPin("1235", stored)).toBe(false);
  });
  it("uses the scrypt$<salt>$<hash> format with a random salt", () => {
    const a = hashPin("1234");
    const b = hashPin("1234");
    expect(a).toMatch(/^scrypt\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(a).not.toBe(b);
    const [, salt, hash] = a.split("$");
    expect(Buffer.from(salt, "base64")).toHaveLength(16);
    expect(Buffer.from(hash, "base64")).toHaveLength(32);
  });
  it("returns false for a missing or malformed stored hash", () => {
    expect(verifyPin("1234", null)).toBe(false);
    expect(verifyPin("1234", "")).toBe(false);
    expect(verifyPin("1234", "bcrypt$abc$def")).toBe(false);
    expect(verifyPin("1234", "scrypt$AAAA$AAAA")).toBe(false);
  });
});

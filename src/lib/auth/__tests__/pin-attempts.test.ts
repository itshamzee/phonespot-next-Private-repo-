// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  PIN_LOCK_15_MESSAGE,
  PIN_LOCK_30_MESSAGE,
  PIN_LOCK_PERMANENT_MESSAGE,
  isPinLocked,
  lockMessageFor,
  lockUntilFor,
} from "../pin-attempts";

const now = 1_780_000_000_000;

describe("lockUntilFor", () => {
  it("locks 15 minutes at 5, 30 minutes at 10 and permanently from 15", () => {
    expect(lockUntilFor(4, now)).toBeNull();
    expect(lockUntilFor(5, now)).toBe(new Date(now + 15 * 60_000).toISOString());
    expect(lockUntilFor(6, now)).toBeNull();
    expect(lockUntilFor(9, now)).toBeNull();
    expect(lockUntilFor(10, now)).toBe(new Date(now + 30 * 60_000).toISOString());
    expect(lockUntilFor(14, now)).toBeNull();
    expect(lockUntilFor(15, now)).toBe("infinity");
    expect(lockUntilFor(20, now)).toBe("infinity");
  });
});

describe("lockMessageFor", () => {
  it("names the lock level", () => {
    expect(lockMessageFor(5)).toBe(PIN_LOCK_15_MESSAGE);
    expect(PIN_LOCK_15_MESSAGE).toBe("Pinkoden er låst i 15 minutter");
    expect(lockMessageFor(10)).toBe(PIN_LOCK_30_MESSAGE);
    expect(PIN_LOCK_30_MESSAGE).toBe("Pinkoden er låst i 30 minutter");
    expect(lockMessageFor(15)).toBe(PIN_LOCK_PERMANENT_MESSAGE);
    expect(PIN_LOCK_PERMANENT_MESSAGE).toBe("Pinkoden er låst. Bed ejeren om at sætte en ny pinkode");
  });
});

describe("isPinLocked", () => {
  it("is unlocked without locked_until or after it", () => {
    expect(isPinLocked({ failed_attempts: 3, locked_until: null }, now)).toBe(false);
    expect(isPinLocked({ failed_attempts: 5, locked_until: new Date(now - 1).toISOString() }, now)).toBe(false);
  });
  it("is locked before locked_until", () => {
    expect(isPinLocked({ failed_attempts: 5, locked_until: new Date(now + 1000).toISOString() }, now)).toBe(true);
  });
  it("fails closed on infinity or a malformed timestamp", () => {
    expect(isPinLocked({ failed_attempts: 15, locked_until: "infinity" }, now)).toBe(true);
    expect(isPinLocked({ failed_attempts: 5, locked_until: "not a date" }, now)).toBe(true);
  });
  it("is locked from 15 failed attempts even if locked_until was cleared", () => {
    expect(isPinLocked({ failed_attempts: 15, locked_until: null }, now)).toBe(true);
  });
});

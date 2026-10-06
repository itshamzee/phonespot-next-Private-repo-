import { describe, expect, it } from "vitest";
import { generatePassword, normalizeEmail, passwordProblem, validateNewStaff } from "../staff-admin";

describe("staff-admin", () => {
  it("normalises e-mail and rejects junk", () => {
    expect(normalizeEmail("  Ali@PhoneSpot.DK ")).toBe("ali@phonespot.dk");
    expect(normalizeEmail("ali")).toBeNull();
  });

  it("requires at least 10 characters", () => {
    expect(passwordProblem("123456789")).not.toBeNull();
    expect(passwordProblem("1234567890")).toBeNull();
  });

  it("only allows employee or manager", () => {
    const base = { name: "Ali", email: "a@b.dk", location_slug: "vejle", password: "1234567890" };
    expect(validateNewStaff({ ...base, role: "employee" }).ok).toBe(true);
    expect(validateNewStaff({ ...base, role: "owner" }).ok).toBe(false);
  });

  it("generates readable passwords without look-alike characters", () => {
    const pw = generatePassword(40);
    expect(pw).toHaveLength(40);
    expect(pw).not.toMatch(/[0O1lI]/);
  });
});

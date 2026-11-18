import { describe, expect, it } from "vitest";
import type { StaffIdentity } from "@/lib/auth/require-staff";
import { canSeeStatistik, statViewer } from "../access";

function staff(over: Partial<StaffIdentity>): StaffIdentity {
  return {
    id: "s1",
    role: "employee",
    name: "Test",
    email: "t@phonespot.dk",
    location_id: "loc-1",
    location_slug: "vejle",
    permissions: [],
    ...over,
  };
}

describe("canSeeStatistik", () => {
  it("ejeren må altid", () => {
    expect(canSeeStatistik({ role: "owner" })).toBe(true);
  });
  it("medarbejder uden tilladelse må ikke", () => {
    expect(canSeeStatistik({ role: "employee", permissions: [] })).toBe(false);
    expect(canSeeStatistik({ role: "employee" })).toBe(false);
    expect(canSeeStatistik({ role: "manager", permissions: null })).toBe(false);
  });
  it("medarbejder med se_statistik må", () => {
    expect(canSeeStatistik({ role: "employee", permissions: ["se_statistik"] })).toBe(true);
  });
  it("praktikant må aldrig, heller ikke med tilladelsen", () => {
    expect(canSeeStatistik({ role: "intern", permissions: ["se_statistik"] })).toBe(false);
  });
});

describe("statViewer", () => {
  const allowed = { permissions: ["se_statistik" as const] };

  it("giver null uden adgang", () => {
    expect(statViewer(staff({}), "vejle", undefined)).toBeNull();
    expect(statViewer(staff({ role: "intern", ...allowed }), "vejle", undefined)).toBeNull();
  });

  it("medarbejder ser altid egen butik, uanset ønsket butik", () => {
    for (const requested of ["alle", "slagelse", undefined]) {
      const v = statViewer(staff(allowed), "vejle", requested);
      expect(v).toEqual({ isOwner: false, scope: "vejle", canExport: false });
    }
  });

  it("medarbejder uden butik forbliver ingen", () => {
    const v = statViewer(staff({ ...allowed, location_slug: null, location_id: null }), "ingen", "alle");
    expect(v?.scope).toBe("ingen");
  });

  it("ejeren vælger butik via forespørgslen", () => {
    expect(statViewer(staff({ role: "owner" }), "alle", "slagelse")).toEqual({
      isOwner: true,
      scope: "slagelse",
      canExport: true,
    });
  });

  it("ejeren falder tilbage til cookie-scope ved ugyldig værdi", () => {
    expect(statViewer(staff({ role: "owner" }), "vejle", "nonsense")?.scope).toBe("vejle");
    expect(statViewer(staff({ role: "owner" }), "alle", undefined)?.scope).toBe("alle");
  });

  it("canExport kun for ejer eller eksportere", () => {
    expect(statViewer(staff({ permissions: ["se_statistik", "eksportere"] }), "vejle", undefined)?.canExport).toBe(true);
    expect(statViewer(staff(allowed), "vejle", undefined)?.canExport).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { hasPermission, parsePermissions } from "../permissions";

describe("hasPermission", () => {
  it("owner har altid tilladelse", () => {
    expect(hasPermission({ role: "owner" }, "eksportere")).toBe(true);
  });
  it("employee har rollens standard", () => {
    expect(hasPermission({ role: "employee" }, "lave_retur")).toBe(true);
    expect(hasPermission({ role: "employee" }, "lukke_dagen")).toBe(true);
    expect(hasPermission({ role: "employee" }, "give_rabat")).toBe(true);
  });
  it("employee mangler eksportere uden ekstra tilladelse", () => {
    expect(hasPermission({ role: "employee" }, "eksportere")).toBe(false);
    expect(hasPermission({ role: "employee", permissions: null }, "eksportere")).toBe(false);
  });
  it("ekstra tilladelser lægges oven i rollen", () => {
    expect(hasPermission({ role: "employee", permissions: ["eksportere"] }, "eksportere")).toBe(true);
  });
  it("intern har ingen standard, men kan få ekstra", () => {
    expect(hasPermission({ role: "intern" }, "lave_retur")).toBe(false);
    expect(hasPermission({ role: "intern", permissions: ["lave_retur"] }, "lave_retur")).toBe(true);
  });
  it("ukendt rolle har ingen standard", () => {
    expect(hasPermission({ role: "gaest" }, "lave_retur")).toBe(false);
  });
});

describe("parsePermissions", () => {
  it("filtrerer ukendte strenge og ikke-arrays fra", () => {
    expect(parsePermissions(["eksportere", "noget_andet", 5])).toEqual(["eksportere"]);
    expect(parsePermissions(null)).toEqual([]);
  });
});

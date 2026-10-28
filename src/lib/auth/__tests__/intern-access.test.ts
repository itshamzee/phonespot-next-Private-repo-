import { describe, expect, it } from "vitest";
import { INTERN_HOME, internMayAccess, internMayOpenPage } from "../intern-access";

describe("internMayAccess", () => {
  it("tillader hurtig-optagelsens API'er", () => {
    expect(internMayAccess("/api/admin/accessories/by-ean", "GET")).toBe(true);
    expect(internMayAccess("/api/admin/accessories/by-ean", "POST")).toBe(true);
    expect(internMayAccess("/api/admin/accessories/identify", "POST")).toBe(true);
    expect(internMayAccess("/api/admin/accessories/studio-photo", "POST")).toBe(true);
    expect(internMayAccess("/api/admin/accessories/candidates", "POST")).toBe(true);
    expect(internMayAccess("/api/admin/accessories/generate-ean", "POST")).toBe(true);
    expect(internMayAccess("/api/admin/products", "POST")).toBe(true);
    expect(internMayAccess("/api/platform/images/upload", "POST")).toBe(true);
    expect(internMayAccess("/api/admin/me", "GET")).toBe(true);
  });

  it("afviser alt andet", () => {
    expect(internMayAccess("/api/admin/products", "GET")).toBe(false);
    expect(internMayAccess("/api/admin/products/123", "DELETE")).toBe(false);
    expect(internMayAccess("/api/admin/orders", "GET")).toBe(false);
    expect(internMayAccess("/api/admin/staff", "POST")).toBe(false);
    expect(internMayAccess("/api/pos/sale", "POST")).toBe(false);
    expect(internMayAccess("/", "GET")).toBe(false);
  });

  it("ignorerer en afsluttende skråstreg", () => {
    expect(internMayAccess("/api/admin/accessories/identify/", "POST")).toBe(true);
  });
});

describe("internMayOpenPage", () => {
  it("kun hurtig-optagelsen", () => {
    expect(INTERN_HOME).toBe("/admin/produkter/hurtig-cover");
    expect(internMayOpenPage("/admin/produkter/hurtig-cover")).toBe(true);
    expect(internMayOpenPage("/admin")).toBe(false);
    expect(internMayOpenPage("/admin/kunder")).toBe(false);
  });
});

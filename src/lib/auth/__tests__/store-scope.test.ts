import { describe, expect, it } from "vitest";
import {
  StoreAccessError,
  assertStoreAccess,
  buildLocationIndex,
  canAccessStore,
  deriveLocationSlug,
  getStoreScope,
  isOwner,
  locationIdForSlug,
  normalizeScopeSlug,
  parseRequestedScope,
  slugForLocationId,
  storeForNewRecord,
  type ScopedStaff,
} from "../store-scope";

const owner: ScopedStaff = { role: "owner", location_slug: null };
const vejle: ScopedStaff = { role: "employee", location_slug: "vejle" };
const vejleManager: ScopedStaff = { role: "manager", location_slug: "vejle" };
const slagelse: ScopedStaff = { role: "employee", location_slug: "slagelse" };
const webshop: ScopedStaff = { role: "employee", location_slug: "webshop" };
const unassigned: ScopedStaff = { role: "employee", location_slug: null };

describe("parseRequestedScope / normalizeScopeSlug", () => {
  it("accepts alle and the three slugs, case and whitespace insensitive", () => {
    expect(parseRequestedScope("alle")).toBe("alle");
    expect(parseRequestedScope(" Vejle ")).toBe("vejle");
    expect(parseRequestedScope("SLAGELSE")).toBe("slagelse");
    expect(parseRequestedScope("webshop")).toBe("webshop");
  });

  it("rejects everything else", () => {
    for (const bad of ["", "ingen", "kbh", "vejle;drop", null, undefined, 3, {}]) {
      expect(parseRequestedScope(bad)).toBeNull();
    }
    expect(normalizeScopeSlug("alle")).toBeNull();
  });
});

describe("getStoreScope", () => {
  it("owner: the requested slug, or alle", () => {
    expect(getStoreScope(owner, "slagelse")).toBe("slagelse");
    expect(getStoreScope(owner, "webshop")).toBe("webshop");
    expect(getStoreScope(owner, "alle")).toBe("alle");
    expect(getStoreScope(owner)).toBe("alle");
    expect(getStoreScope(owner, null)).toBe("alle");
  });

  it("owner: garbage in the cookie falls back to alle", () => {
    expect(getStoreScope(owner, "kbh")).toBe("alle");
    expect(getStoreScope(owner, "")).toBe("alle");
  });

  it("staff: always their own store, whatever is requested", () => {
    expect(getStoreScope(vejle)).toBe("vejle");
    expect(getStoreScope(vejle, "slagelse")).toBe("vejle");
    expect(getStoreScope(vejle, "alle")).toBe("vejle");
    expect(getStoreScope(slagelse, "vejle")).toBe("slagelse");
    expect(getStoreScope(webshop, "alle")).toBe("webshop");
  });

  it("managers are not super admins", () => {
    expect(isOwner(vejleManager)).toBe(false);
    expect(getStoreScope(vejleManager, "alle")).toBe("vejle");
  });

  it("only the exact role 'owner' is a super admin", () => {
    for (const role of ["admin", "Owner", "superadmin", "", "employee", "manager"]) {
      expect(isOwner({ role })).toBe(false);
      expect(getStoreScope({ role, location_slug: "vejle" }, "alle")).toBe("vejle");
    }
  });

  it("staff without a store fail closed to ingen", () => {
    expect(getStoreScope(unassigned, "vejle")).toBe("ingen");
    expect(getStoreScope({ role: "employee", location_slug: "kbh" }, "alle")).toBe("ingen");
  });
});

describe("canAccessStore / assertStoreAccess", () => {
  it("owner can access every store and unattributed rows", () => {
    for (const row of ["vejle", "slagelse", "webshop", null, undefined, "xyz"]) {
      expect(canAccessStore(owner, row)).toBe(true);
    }
  });

  it("staff can access only their own store", () => {
    expect(canAccessStore(vejle, "vejle")).toBe(true);
    expect(canAccessStore(vejle, "Vejle")).toBe(true);
    expect(canAccessStore(vejle, "slagelse")).toBe(false);
    expect(canAccessStore(vejle, "webshop")).toBe(false);
    expect(canAccessStore(slagelse, "vejle")).toBe(false);
  });

  it("physical staff cannot touch unattributed or unknown rows", () => {
    expect(canAccessStore(vejle, null)).toBe(false);
    expect(canAccessStore(vejle, undefined)).toBe(false);
    expect(canAccessStore(vejle, "")).toBe(false);
    expect(canAccessStore(vejle, "xyz")).toBe(false);
  });

  it("webshop staff also own the rows without a physical store", () => {
    expect(canAccessStore(webshop, "webshop")).toBe(true);
    expect(canAccessStore(webshop, null)).toBe(true);
    expect(canAccessStore(webshop, "vejle")).toBe(false);
  });

  it("staff without a store can access nothing", () => {
    for (const row of ["vejle", "slagelse", "webshop", null]) {
      expect(canAccessStore(unassigned, row)).toBe(false);
    }
  });

  it("assertStoreAccess throws a 403 StoreAccessError", () => {
    expect(() => assertStoreAccess(vejle, "vejle")).not.toThrow();
    expect(() => assertStoreAccess(owner, "slagelse")).not.toThrow();
    expect(() => assertStoreAccess(vejle, "slagelse")).toThrow(StoreAccessError);
    try {
      assertStoreAccess(vejle, "slagelse");
    } catch (err) {
      expect((err as StoreAccessError).status).toBe(403);
    }
  });
});

describe("storeForNewRecord", () => {
  it("staff always get their own physical store, ignoring the request", () => {
    expect(storeForNewRecord(vejle, "vejle", "slagelse")).toBe("vejle");
    expect(storeForNewRecord(slagelse, "slagelse", "vejle")).toBe("slagelse");
  });

  it("webshop staff and unassigned staff cannot create store records", () => {
    expect(storeForNewRecord(webshop, "webshop", "vejle")).toBeNull();
    expect(storeForNewRecord(unassigned, "ingen", "vejle")).toBeNull();
  });

  it("owner: the explicit choice, else the scope, else nothing", () => {
    expect(storeForNewRecord(owner, "alle", "slagelse")).toBe("slagelse");
    expect(storeForNewRecord(owner, "vejle", null)).toBe("vejle");
    expect(storeForNewRecord(owner, "alle", null)).toBeNull();
    expect(storeForNewRecord(owner, "webshop", null)).toBeNull();
    expect(storeForNewRecord(owner, "alle", "webshop")).toBeNull();
  });
});

describe("location index", () => {
  const rows = [
    { id: "L1", name: "Slagelse", type: "store", slug: "slagelse" },
    { id: "L2", name: "Vejle", type: "store", slug: null },
    { id: "L3", name: "Online", type: "online" },
    { id: "L4", name: "Lager", type: "warehouse" },
  ];

  it("derives slugs from the slug column, then type, then name (pre-migration databases)", () => {
    expect(deriveLocationSlug(rows[0])).toBe("slagelse");
    expect(deriveLocationSlug(rows[1])).toBe("vejle");
    expect(deriveLocationSlug(rows[2])).toBe("webshop");
    expect(deriveLocationSlug(rows[3])).toBeNull();
  });

  it("translates both ways", () => {
    const index = buildLocationIndex(rows);
    expect(locationIdForSlug(index, "vejle")).toBe("L2");
    expect(locationIdForSlug(index, "webshop")).toBe("L3");
    expect(locationIdForSlug(index, "kbh")).toBeNull();
    expect(locationIdForSlug(index, null)).toBeNull();
    expect(slugForLocationId(index, "L1")).toBe("slagelse");
    expect(slugForLocationId(index, "L4")).toBeNull();
    expect(slugForLocationId(index, null)).toBeNull();
  });

  it("first row wins for a duplicated slug", () => {
    const index = buildLocationIndex([
      { id: "A", name: "Vejle", type: "store" },
      { id: "B", name: "Vejle", type: "store" },
    ]);
    expect(locationIdForSlug(index, "vejle")).toBe("A");
  });
});

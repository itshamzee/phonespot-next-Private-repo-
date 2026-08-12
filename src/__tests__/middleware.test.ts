// @vitest-environment node
//
// The staff gate in src/middleware.ts is the only thing standing in front of 69
// route files that run on a service-role Supabase client. These tests pin the
// behaviour that matters: deny by default, deny when the staff lookup blows up
// (never fail open), allow either credential shape, and keep the two
// storefront-facing GETs public without opening their POST.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

let cookieUser: { id: string } | null = null;
let bearerStaff: { id: string; role: string } | null = null;
let staffRow: { id: string; role: string; name: string | null; email: string | null } | null = null;
let staffLookupThrows = false;

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(async (request: NextRequest) => {
    const { NextResponse } = await import("next/server");
    return { response: NextResponse.next({ request }), user: cookieUser };
  }),
}));

vi.mock("@/lib/auth/require-staff", () => ({
  requireStaff: vi.fn(async () => bearerStaff),
  lookupStaffByAuthId: vi.fn(async () => {
    if (staffLookupThrows) throw new Error("staff lookup failed: boom");
    return staffRow;
  }),
}));

const { middleware, config } = await import("@/middleware");

function req(path: string, init: RequestInit = {}) {
  return new NextRequest(new Request(`https://phonespot.dk${path}`, init));
}

beforeEach(() => {
  cookieUser = null;
  bearerStaff = null;
  staffRow = null;
  staffLookupThrows = false;
});

describe("middleware matcher", () => {
  it("covers both gated prefixes and nothing else", () => {
    expect(config.matcher).toEqual(["/api/admin/:path*", "/api/platform/:path*"]);
  });

  it("does not match the Stripe webhook", () => {
    // Payment handling must be unreachable from this gate.
    expect(config.matcher.some((m) => m.startsWith("/api/webhook"))).toBe(false);
  });

  it("runs on the Node runtime so the service-role key is a normal server env", () => {
    expect(config.runtime).toBe("nodejs");
  });
});

describe("unauthenticated callers", () => {
  it.each([
    ["GET", "/api/admin/b2b"],
    ["GET", "/api/platform/devices"],
    ["POST", "/api/platform/draft-orders"],
    ["PATCH", "/api/platform/devices/abc"],
    ["DELETE", "/api/platform/images/some-key"],
    ["POST", "/api/admin/ai-reply"],
  ])("%s %s is denied with 401", async (method, path) => {
    const res = await middleware(req(path, { method }));
    expect(res.status).toBe(401);
  });

  it("answers with JSON, never a redirect", async () => {
    const res = await middleware(req("/api/admin/b2b"));
    expect(res.status).toBe(401);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toMatchObject({ error: "Unauthorized" });
  });
});

describe("authenticated but not staff", () => {
  it("is denied with 403", async () => {
    cookieUser = { id: "user-1" };
    staffRow = null;
    const res = await middleware(req("/api/platform/devices"));
    expect(res.status).toBe(403);
  });

  it("denies inactive staff members with 403", async () => {
    cookieUser = { id: "user-1" };
    // Simulate inactive staff: lookup returns null because is_active filter
    // excludes them from the database query
    staffRow = null;
    const res = await middleware(req("/api/platform/devices"));
    expect(res.status).toBe(403);
  });
});

describe("staff callers", () => {
  it("passes through with a staff cookie session", async () => {
    cookieUser = { id: "user-1" };
    staffRow = { id: "staff-1", role: "owner", name: "Hamza", email: "h@phonespot.dk" };
    const res = await middleware(req("/api/platform/devices"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("passes through with a staff bearer token (staffFetch)", async () => {
    bearerStaff = { id: "staff-1", role: "owner" };
    const res = await middleware(
      req("/api/platform/devices", { headers: { authorization: "Bearer good-token" } }),
    );
    expect(res.status).toBe(200);
  });

  it("denies a bearer token that does not resolve to staff", async () => {
    bearerStaff = null;
    // A cookie session must not rescue a bad bearer token.
    cookieUser = { id: "user-1" };
    staffRow = { id: "staff-1", role: "owner", name: null, email: null };
    const res = await middleware(
      req("/api/platform/devices", { headers: { authorization: "Bearer bad-token" } }),
    );
    expect(res.status).toBe(401);
  });
});

describe("fail closed", () => {
  it("denies when the staff lookup errors", async () => {
    cookieUser = { id: "user-1" };
    staffLookupThrows = true;
    const res = await middleware(req("/api/platform/devices"));
    expect(res.status).toBe(401);
  });
});

describe("allowlist", () => {
  it.each([
    "/api/admin/spare-parts/categories",
    "/api/admin/spare-parts/quality-tiers",
    "/api/admin/spare-parts/categories/",
  ])("GET %s stays public for the /reservedele filter sidebar", async (path) => {
    const res = await middleware(req(path));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it.each([
    "/api/admin/spare-parts/categories",
    "/api/admin/spare-parts/quality-tiers",
  ])("POST %s is still gated", async (path) => {
    const res = await middleware(req(path, { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("does not leak the allowlist to sibling paths", async () => {
    const res = await middleware(req("/api/admin/spare-parts/categories/some-id"));
    expect(res.status).toBe(401);
  });
});

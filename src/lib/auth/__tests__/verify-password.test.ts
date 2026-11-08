// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  createClient: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...a: unknown[]) => {
    m.createClient(...a);
    return { auth: { signInWithPassword: m.signIn, signOut: m.signOut } };
  },
}));

import { verifyStaffPassword } from "../verify-password";

beforeEach(() => {
  m.createClient.mockReset();
  m.signIn.mockReset();
  m.signOut.mockReset().mockResolvedValue({ error: null });
});

describe("verifyStaffPassword", () => {
  it("signs in with a separate, non-persisting client and ends only that session", async () => {
    m.signIn.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    expect(await verifyStaffPassword("m@phonespot.dk", "hemmelig")).toBe(true);
    expect(m.signIn).toHaveBeenCalledWith({ email: "m@phonespot.dk", password: "hemmelig" });
    const opts = m.createClient.mock.calls[0][2] as { auth: Record<string, unknown> };
    expect(opts.auth).toMatchObject({ persistSession: false, autoRefreshToken: false });
    expect(m.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("returns false on a wrong password", async () => {
    m.signIn.mockResolvedValue({ data: { session: null }, error: { message: "Invalid login credentials" } });
    expect(await verifyStaffPassword("m@phonespot.dk", "forkert")).toBe(false);
    expect(m.signOut).not.toHaveBeenCalled();
  });

  it("returns false without an email or password and never calls Supabase", async () => {
    expect(await verifyStaffPassword(null, "x")).toBe(false);
    expect(await verifyStaffPassword("m@phonespot.dk", "")).toBe(false);
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it("still answers true if ending the session fails", async () => {
    m.signIn.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    m.signOut.mockRejectedValue(new Error("network"));
    expect(await verifyStaffPassword("m@phonespot.dk", "hemmelig")).toBe(true);
  });
});

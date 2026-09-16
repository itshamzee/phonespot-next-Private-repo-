// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { POST as reserve } from "../reserve/route";
import { POST as release } from "../release/route";
const s = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  set: vi.fn(),
  rpc: vi.fn(),
  error: false,
  updates: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (s.cookie ? { value: s.cookie } : undefined),
    set: (...args: unknown[]) => {
      s.cookie = args[1] as string;
      s.set(...args);
    },
  }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    rpc: s.rpc,
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        update: s.updates,
        maybeSingle: async () => ({
          data: { source: "internal" },
          error: s.error ? {} : null,
        }),
      };
      s.updates.mockReturnValue(q);
      return q;
    },
  }),
}));
const id = "11111111-1111-4111-8111-111111111111";
const req = (body: unknown) =>
  new NextRequest("https://example.com/api/cart", {
    method: "POST",
    body: JSON.stringify(body),
  });
beforeEach(() => {
  s.cookie = undefined;
  s.error = false;
  vi.clearAllMocks();
  s.rpc.mockResolvedValue({
    data: { reserved: true, deviceId: id, reservedUntil: "later" },
    error: null,
  });
});
afterEach(() => vi.unstubAllEnvs());
it("mints an HttpOnly owner cookie and returns only public reservation fields", async () => {
  const r = await reserve(req({ deviceId: id }));
  expect(r.status).toBe(200);
  expect(s.set).toHaveBeenCalledWith(
    expect.any(String),
    expect.stringMatching(/^[a-f0-9]{64}$/),
    expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
  );
  expect(await r.json()).toEqual({ deviceId: id, reservedUntil: "later" });
  await reserve(req({ deviceId: id }));
  expect(s.set).toHaveBeenCalledTimes(1);
});
it("missing owner release does not mutate", async () => {
  expect(await (await release(req({ deviceId: id }))).json()).toEqual({
    released: false,
  });
  expect(s.updates).not.toHaveBeenCalled();
  expect(s.rpc).not.toHaveBeenCalled();
});
it("does not allow client owner to replace cookie owner", async () => {
  s.cookie = "a".repeat(64);
  s.rpc.mockResolvedValue({ data: { released: false }, error: null });
  expect(
    await (await release(req({ deviceId: id, owner: "forged" }))).json(),
  ).toEqual({ released: false });
  expect(s.rpc).toHaveBeenCalledWith(
    "release_cart_device",
    expect.objectContaining({
      p_owner_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }),
  );
});
it.each([{}, { deviceId: "bad" }, null])("bad input is 400", async (body) => {
  expect((await reserve(req(body))).status).toBe(400);
  expect((await release(req(body))).status).toBe(400);
});
it("infrastructure errors return 503", async () => {
  s.error = true;
  s.rpc.mockResolvedValue({ data: null, error: {} });
  expect((await reserve(req({ deviceId: id }))).status).toBe(503);
});
it("uses a secure host cookie in production and never returns its hash or token", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const response = await reserve(req({ deviceId: id, owner: "forged" }));
  expect(s.set).toHaveBeenCalledWith(
    "__Host-phonespot-cart",
    expect.any(String),
    expect.objectContaining({
      httpOnly: true,
      secure: true,
      path: "/",
      sameSite: "lax",
    }),
  );
  expect(s.set.mock.calls[0][2]).not.toHaveProperty("domain");
  const ownerHash = createHash("sha256").update(s.cookie!).digest("hex");
  expect(s.rpc).toHaveBeenCalledWith("reserve_cart_device", {
    p_device_id: id,
    p_owner_hash: ownerHash,
  });
  const body = await response.text();
  expect(body).not.toContain(s.cookie!);
  expect(body).not.toContain(ownerHash);
});
it("reservation conflicts return 409", async () => {
  s.rpc.mockResolvedValue({ data: { reserved: false }, error: null });
  expect((await reserve(req({ deviceId: id }))).status).toBe(409);
});
it("release infrastructure failure is 503", async () => {
  s.cookie = "a".repeat(64);
  s.rpc.mockResolvedValue({ error: {} });
  expect((await release(req({ deviceId: id }))).status).toBe(503);
});
it("malformed JSON returns 400", async () => {
  for (const route of [reserve, release])
    expect(
      (
        await route(
          new NextRequest("https://example.invalid", {
            method: "POST",
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
});
it("invalid cookies cannot release and are replaced on reserve", async () => {
  s.cookie = "invalid";
  await release(req({ deviceId: id }));
  expect(s.rpc).not.toHaveBeenCalled();
  expect(s.set).not.toHaveBeenCalled();
  await reserve(req({ deviceId: id }));
  expect(s.set).toHaveBeenCalledTimes(1);
});

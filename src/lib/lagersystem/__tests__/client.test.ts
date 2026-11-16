// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { getLagersystemConfig, isLagersystemEnabled } from "../config";
import { createLagersystemClient, describeLagersystemError, LagersystemError } from "../client";

const cfg = { url: "https://lager.test", apiKey: "k-123" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;

describe("getLagersystemConfig", () => {
  it("is null unless both env vars are set", () => {
    expect(getLagersystemConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(getLagersystemConfig(env({ LAGERSYSTEM_URL: "https://x" }))).toBeNull();
    expect(getLagersystemConfig(env({ LAGERSYSTEM_URL: " ", LAGERSYSTEM_API_KEY: "k" }))).toBeNull();
    expect(isLagersystemEnabled(env({ LAGERSYSTEM_URL: "https://x" }))).toBe(false);
  });
  it("normalises trailing slashes and a pasted /api/v1 suffix", () => {
    expect(getLagersystemConfig(env({ LAGERSYSTEM_URL: "https://lager.test/api/v1/", LAGERSYSTEM_API_KEY: " k " })))
      .toEqual({ url: "https://lager.test", apiKey: "k" });
    expect(isLagersystemEnabled(env({ LAGERSYSTEM_URL: "https://x", LAGERSYSTEM_API_KEY: "k" }))).toBe(true);
  });
});

describe("client", () => {
  it("searches parts with bearer auth and a clamped limit", async () => {
    const f = vi.fn(async () => json(200, { parts: [{ shared_sku: "SCR-IP13-OLED", name: "Skærm", category: null, quality: null, device_models: [], cost_price_ore: 41500, active: true }] }));
    const parts = await createLagersystemClient(cfg, f).searchParts("iphone 13", 500);
    expect(parts[0].shared_sku).toBe("SCR-IP13-OLED");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://lager.test/api/v1/parts?q=iphone+13&limit=50");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer k-123");
  });

  it("posts a movement and returns the replay flag", async () => {
    const movement = { id: "m1", location: "vejle-hub", shared_sku: "S", type: "TAKE", qty: -1, balance_after: 4, company: "phonespot", reference: "PS-1", actor_label: "a", created_at: "2026-10-13T10:00:00Z" };
    const f = vi.fn(async () => json(200, { movement, replayed: true }));
    const res = await createLagersystemClient(cfg, f).postMovement({ idempotency_key: "k", location: "vejle-hub", shared_sku: "S", type: "TAKE", qty: 1, actor_label: "a", reference: "PS-1" });
    expect(res).toEqual({ movement, replayed: true });
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({ idempotency_key: "k", type: "TAKE", qty: 1 });
  });

  it("maps API errors to a non-retryable LagersystemError", async () => {
    const f = vi.fn(async () => json(403, { error: { code: "forbidden_location", message: "nope" } }));
    const err = await createLagersystemClient(cfg, f).getBalances("phonespot-slagelse").catch((e) => e);
    expect(err).toBeInstanceOf(LagersystemError);
    expect(err).toMatchObject({ status: 403, code: "forbidden_location", retryable: false });
    expect(describeLagersystemError(err)).toBe("PhoneSpot må ikke bogføre på denne lokation.");
  });

  it("treats 5xx, 429 and network failures as retryable", async () => {
    const e500 = await createLagersystemClient(cfg, vi.fn(async () => json(500, { error: { code: "internal", message: "x" } }))).listLocations().catch((e) => e);
    expect(e500.retryable).toBe(true);
    const e429 = await createLagersystemClient(cfg, vi.fn(async () => new Response("slow down", { status: 429 }))).listLocations().catch((e) => e);
    expect(e429.retryable).toBe(true);
    const net = await createLagersystemClient(cfg, vi.fn(async () => { throw new TypeError("fetch failed"); })).listLocations().catch((e) => e);
    expect(net).toMatchObject({ status: 0, code: "network", retryable: true });
    expect(describeLagersystemError(net)).toBe("Lagersystemet svarer ikke lige nu. Prøv igen om lidt.");
  });

  it("maps a timeout abort to code timeout", async () => {
    const f = vi.fn(async () => { throw Object.assign(new Error("t"), { name: "TimeoutError" }); });
    const err = await createLagersystemClient(cfg, f).listLocations().catch((e) => e);
    expect(err).toMatchObject({ status: 0, code: "timeout", retryable: true });
  });

  it("treats 409 invalid_state and 404 unknown_transfer as final, with Danish text", async () => {
    const inv = await createLagersystemClient(cfg, vi.fn(async () => json(409, { error: { code: "invalid_state", message: "x" } }))).listLocations().catch((e) => e);
    expect(inv).toMatchObject({ status: 409, code: "invalid_state", retryable: false });
    expect(describeLagersystemError(inv)).toMatch(/status/i);
    const unk = await createLagersystemClient(cfg, vi.fn(async () => json(404, { error: { code: "unknown_transfer", message: "x" } }))).listLocations().catch((e) => e);
    expect(unk.retryable).toBe(false);
    expect(describeLagersystemError(unk)).toBe("Flytningen findes ikke.");
  });

  it("encodes the sku in /parts/:sku", async () => {
    const f = vi.fn(async () => json(200, { part: { shared_sku: "A/B" } }));
    await createLagersystemClient(cfg, f).getPart("A/B");
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe("https://lager.test/api/v1/parts/A%2FB");
  });
});

describe("server-only guard", () => {
  it("client.ts and config.ts import server-only", async () => {
    const { readFileSync } = await import("node:fs");
    for (const f of ["client.ts", "config.ts"]) {
      expect(readFileSync(new URL(`../${f}`, import.meta.url), "utf8")).toMatch(/^import "server-only";/);
    }
  });
});

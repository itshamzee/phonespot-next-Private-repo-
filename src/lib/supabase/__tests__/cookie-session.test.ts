// @vitest-environment jsdom
//
// The whole remediation rests on one seam: the admin browser client must write
// a session cookie that the server side can read back. If the cookie name or
// encoding ever drifts apart, middleware sees no user and 401s the entire
// admin. This round-trips a session through document.cookie with no network, so
// a regression shows up here rather than in production.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const AUTH_USER_ID = "11111111-2222-3333-4444-555555555555";

// Vitest does not load .env.local; the clients read these at module scope.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://project-ref.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "anon-key-for-tests";

const { createBrowserClient } = await import("@/lib/supabase/client");
const { createRequestAuthClient } = await import("@/lib/supabase/server");

/** An unsigned JWT is fine here — nothing in this test verifies the signature. */
function fakeJwt(expSeconds: number): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url").replace(/=+$/, "");
  return [
    b64({ alg: "HS256", typ: "JWT" }),
    b64({ sub: AUTH_USER_ID, exp: expSeconds, role: "authenticated" }),
    "signature-not-checked-here",
  ].join(".");
}

function clearCookies() {
  for (const pair of document.cookie.split(";")) {
    const name = pair.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; path=/`;
  }
}

/**
 * supabase-js verifies the token against /auth/v1/user when a session is set.
 * Stub it: this test is about cookie plumbing, not about Supabase Auth.
 */
const realFetch = globalThis.fetch;

beforeEach(() => {
  clearCookies();
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/auth/v1/user")) {
      return new Response(
        JSON.stringify({
          id: AUTH_USER_ID,
          aud: "authenticated",
          role: "authenticated",
          email: "staff@phonespot.dk",
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    throw new Error(`unexpected network call in test: ${url}`);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

async function signIn() {
  const browser = createBrowserClient();
  browser.auth.stopAutoRefresh(); // do not hold the vitest worker open
  const { error } = await browser.auth.setSession({
    access_token: fakeJwt(Math.floor(Date.now() / 1000) + 3600),
    refresh_token: "refresh-token-placeholder",
  });
  expect(error).toBeNull();
  return browser;
}

describe("admin session storage", () => {
  it("stores the session in cookies, not localStorage", async () => {
    await signIn();

    expect(document.cookie).toContain("-auth-token");
    // The old behaviour this replaces: session in localStorage, where no
    // server-side code — and therefore no middleware — can see it.
    const localKeys = Object.keys(window.localStorage);
    expect(localKeys.filter((k) => k.includes("auth-token"))).toHaveLength(0);
  });

  it("round-trips: what the browser writes, the server client reads", async () => {
    const browser = await signIn();
    const {
      data: { session: browserSession },
    } = await browser.auth.getSession();

    // Exactly what middleware and route handlers see: the raw Cookie header.
    const request = new Request("https://phonespot.dk/api/platform/devices", {
      headers: { cookie: document.cookie },
    });
    const server = createRequestAuthClient(request);
    expect(server).not.toBeNull();

    const {
      data: { session },
    } = await server!.auth.getSession();

    expect(session?.access_token).toBe(browserSession?.access_token);
    expect(session?.user.id).toBe(AUTH_USER_ID);
  });

  it("reads no session when the request carries no cookies", async () => {
    const request = new Request("https://phonespot.dk/api/platform/devices");
    const server = createRequestAuthClient(request);
    const {
      data: { session },
    } = await server!.auth.getSession();

    expect(session).toBeNull();
  });
});

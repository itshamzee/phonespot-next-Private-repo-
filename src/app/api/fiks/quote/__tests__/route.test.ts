// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/lib/fiks/__tests__/fakes";

const fake = { current: fakeSupabase() };
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => fake.current.client }));

const { GET } = await import("@/app/api/fiks/quote/route");

const TOKEN = "11111111-2222-4333-8444-555555555555";
const QUOTE = {
  model: "iPhone 13",
  storage: "128GB",
  answers: { screen: "Små ridser", back: "Perfekt", battery: "God (80%+)", charging_broken: true, other_faults: false, cloud_locked: "Nej" },
  amount: 1850,
  at: "2026-11-19T10:00:00Z",
};

function get(token: string | null) {
  const qs = token === null ? "" : `?token=${encodeURIComponent(token)}`;
  return GET(new Request(`https://phonespot.dk/api/fiks/quote${qs}`));
}

beforeEach(() => {
  fake.current = fakeSupabase({
    contact_inquiries: [
      { id: "i1", channel: "chat", external_thread_id: TOKEN, status: "besvaret", name: "Anna", email: "anna@example.com", metadata: { fiks_quote: QUOTE, fiks_ip: "hash" } },
    ],
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/fiks/quote", () => {
  it("returns the stored quote for a token and nothing about the person", async () => {
    const res = await get(TOKEN);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toEqual({ model: QUOTE.model, storage: QUOTE.storage, answers: QUOTE.answers, amount: 1850 });
    expect(JSON.stringify(body)).not.toMatch(/anna|hash/i);
  });

  it("answers 404 for an unknown, malformed or missing token", async () => {
    for (const token of ["99999999-2222-4333-8444-555555555555", "nope", "", null]) {
      expect((await get(token)).status).toBe(404);
    }
  });

  it("answers 404 when the session has no quote or is closed", async () => {
    fake.current = fakeSupabase({
      contact_inquiries: [{ id: "i1", channel: "chat", external_thread_id: TOKEN, status: "besvaret", metadata: {} }],
    });
    expect((await get(TOKEN)).status).toBe(404);
    fake.current = fakeSupabase({
      contact_inquiries: [{ id: "i1", channel: "chat", external_thread_id: TOKEN, status: "lukket", metadata: { fiks_quote: QUOTE } }],
    });
    expect((await get(TOKEN)).status).toBe(404);
  });

  it("only reads chat sessions, never another channel's inquiry", async () => {
    fake.current = fakeSupabase({
      contact_inquiries: [{ id: "i1", channel: "email", external_thread_id: TOKEN, status: "ny", metadata: { fiks_quote: QUOTE } }],
    });
    expect((await get(TOKEN)).status).toBe(404);
  });
});

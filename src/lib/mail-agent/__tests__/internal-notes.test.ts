// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({ assessInput: null as null | Record<string, unknown> }));

vi.mock("@/lib/mail-agent/agent", async (orig) => ({
  ...(await orig<typeof import("@/lib/mail-agent/agent")>()),
  assessMessage: vi.fn(async (input: Record<string, unknown>) => {
    captured.assessInput = input;
    return {
      assessment: { category: "andet", needs_human: true, reason: "", summary: "", confidence: 0.5, draft: null },
      lookups: [],
      usage: { input: 0, output: 0 },
      model: "test",
    };
  }),
}));
vi.mock("@/lib/mail-agent/drafts", () => ({
  insertDraft: vi.fn(async (_sb: unknown, row: Record<string, unknown>) => ({ id: "d1", ...row })),
  markDraft: vi.fn(),
}));

import { assessAndDraft } from "@/lib/mail-agent/run";

type Row = Record<string, unknown>;

function fakeSb(messages: Row[]) {
  function query(table: string) {
    const api: Record<string, unknown> = {
      select: () => api,
      eq: () => api,
      order: () => api,
      update: () => api,
      maybeSingle: async () => ({ data: table === "contact_inquiries" ? { channel: "email" } : null, error: null }),
      then: (resolve: (v: unknown) => void) => resolve({ data: table === "inquiry_messages" ? messages : [], error: null }),
    };
    return api;
  }
  return { from: query } as never;
}

beforeEach(() => {
  captured.assessInput = null;
});

describe("assessAndDraft og interne noter", () => {
  it("sender aldrig interne noter til modellen", async () => {
    const sb = fakeSb([
      { sender: "customer", body: "Hvor er min pakke?", created_at: "2026-11-19T08:00:00Z", is_internal: false },
      { sender: "staff", body: "kunden er besværlig", created_at: "2026-11-19T08:30:00Z", is_internal: true },
      { sender: "customer", body: "Hallo?", created_at: "2026-11-19T09:00:00Z", is_internal: false },
    ]);
    await assessAndDraft(sb, {
      inquiryId: "i1",
      inquiryMessageId: "m1",
      senderEmail: "kunde@example.com",
      senderName: "Kunde",
      mailbox: "info@phonespot.dk",
      subject: "Pakke",
    });
    expect(JSON.stringify(captured.assessInput)).not.toContain("besværlig");
    expect(captured.assessInput).toMatchObject({ latest: "Hallo?" });
    expect((captured.assessInput as { thread: unknown[] }).thread).toHaveLength(1);
  });
});

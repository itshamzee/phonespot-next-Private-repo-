import { describe, it, expect } from "vitest";
import { decideAutoSend } from "@/lib/mail-agent/run";
import type { Assessment } from "@/lib/mail-agent/types";

const a: Assessment = {
  category: "ordre",
  needs_human: false,
  reason: "",
  summary: "",
  confidence: 0.9,
  draft: { subject: "s", body: "b" },
};

describe("decideAutoSend", () => {
  it("is false by default (no categories enabled)", () => {
    expect(decideAutoSend(a, { enabled: true, autoSendCategories: [], minConfidence: 0.85 })).toBe(false);
  });

  it("is true only when category enabled, not needs_human, confident, and a draft exists", () => {
    const s = { enabled: true, autoSendCategories: ["ordre" as const], minConfidence: 0.85 };
    expect(decideAutoSend(a, s)).toBe(true);
    expect(decideAutoSend({ ...a, needs_human: true }, s)).toBe(false);
    expect(decideAutoSend({ ...a, confidence: 0.8 }, s)).toBe(false);
    expect(decideAutoSend({ ...a, draft: null }, s)).toBe(false);
    expect(decideAutoSend({ ...a, category: "reparation" }, s)).toBe(false);
    expect(decideAutoSend(a, { ...s, enabled: false })).toBe(false);
  });
});

// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { buildTools } from "@/lib/mail-agent/tools";
import { buildPublicTools, normalizeHandoff } from "@/lib/fiks/tools";
import { buildFiksSystemPrompt } from "@/lib/fiks/prompt";
import type { ToolContext } from "@/lib/mail-agent/tools";

function ctx(): ToolContext {
  return { supabase: {} as never, verified: { emails: [] }, log: [], outputs: [], scopeMismatch: { value: false } };
}

describe("buildPublicTools", () => {
  const names = buildPublicTools(ctx(), vi.fn()).map((t) => t.name);

  it("offers price, diagnosis, knowledge and handoff", () => {
    expect(names.sort()).toEqual(["diagnose", "get_knowledge", "handoff", "quote_buyback", "quote_repair"]);
  });

  it("contains none of the personal-data lookups", () => {
    expect(names.some((n) => n.startsWith("lookup_"))).toBe(false);
    expect(names).not.toContain("submit_assessment");
  });

  it("leaves the mail agent's tool list unchanged", () => {
    expect(buildTools(ctx(), vi.fn()).map((t) => t.name)).toEqual([
      "lookup_orders",
      "lookup_repairs",
      "lookup_buyback",
      "lookup_customer",
      "quote_repair",
      "quote_buyback",
      "diagnose",
      "get_knowledge",
      "submit_assessment",
    ]);
  });

  it("records get_knowledge output for the amount filter", async () => {
    const c = ctx();
    const tool = buildPublicTools(c, vi.fn()).find((t) => t.name === "get_knowledge")!;
    await (tool.run as (i: unknown) => Promise<string>)({});
    expect(c.outputs).toHaveLength(1);
  });
});

describe("normalizeHandoff", () => {
  it("lowercases email and requires email or phone", () => {
    expect(normalizeHandoff({ name: "A", email: "A@B.DK", summary: "s" })).toMatchObject({ ok: true, email: "a@b.dk" });
    expect(normalizeHandoff({ name: "A", summary: "s" })).toMatchObject({ ok: false });
    expect(normalizeHandoff({ name: "A", email: "ikke en mail", summary: "s" })).toMatchObject({ ok: false });
    expect(normalizeHandoff({ name: "A", phone: "123", summary: "s" })).toMatchObject({ ok: false });
    expect(normalizeHandoff({ name: " ", phone: "12345678", summary: "s" })).toMatchObject({ ok: false });
    expect(normalizeHandoff({ name: "A", phone: "12 34 56 78", summary: "s" })).toMatchObject({ ok: true, phone: "12 34 56 78" });
  });
});

describe("Fiks system prompt", () => {
  const p = buildFiksSystemPrompt();
  it("says Fiks is an AI and never pretends to be human", () => {
    expect(p).toContain("digitale assistent");
    expect(p).toMatch(/AI/);
  });
  it("forbids the banned words and invented amounts", () => {
    expect(p).toContain('"foxway"');
    expect(p).toContain("Nævn kun et beløb, som et værktøj har returneret");
  });
  it("hands a buyback price over to the form button instead of a pasted link", () => {
    expect(p).toContain("knappen under beskeden fører til sælg-formularen");
    expect(p).toContain("Skriv ikke adressen til formularen");
    expect(p).toContain("saml spørgsmålene i én besked");
  });
});

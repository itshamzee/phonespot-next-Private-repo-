import { describe, it, expect } from "vitest";
import { loadMailAgentSettings, DEFAULT_MAIL_AGENT_SETTINGS } from "@/lib/mail-agent/settings";

function fakeClient(value: unknown | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: value === null ? null : { value } }) }),
      }),
    }),
  } as never;
}

describe("loadMailAgentSettings", () => {
  it("returns defaults when the row is missing", async () => {
    expect(await loadMailAgentSettings(fakeClient(null))).toEqual(DEFAULT_MAIL_AGENT_SETTINGS);
  });

  it("merges stored values and drops unknown categories", async () => {
    const s = await loadMailAgentSettings(
      fakeClient({ autoSendCategories: ["ordre", "bogus"], minConfidence: 0.9 }),
    );
    expect(s.autoSendCategories).toEqual(["ordre"]);
    expect(s.minConfidence).toBe(0.9);
    expect(s.enabled).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import robots from "../robots";

describe("robots.txt", () => {
  const { rules } = robots();
  const groups = Array.isArray(rules) ? rules : [rules];

  it("explicitly allows search and AI answer crawlers", () => {
    const named = groups.find((g) => Array.isArray(g.userAgent));
    for (const bot of ["Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "PerplexityBot", "ClaudeBot", "Google-Extended", "Applebot-Extended"]) {
      expect(named?.userAgent).toContain(bot);
    }
    expect(named?.allow).toBe("/");
  });

  it("keeps every private path disallowed in every group", () => {
    for (const group of groups) {
      for (const path of ["/admin/", "/api/", "/kasse/", "/konto/", "/checkout", "/reparation/booking"]) {
        expect(group.disallow).toContain(path);
      }
    }
  });
});

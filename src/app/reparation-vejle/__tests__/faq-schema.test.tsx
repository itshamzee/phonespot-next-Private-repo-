import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

vi.mock("@/lib/supabase/repairs", () => ({ getRepairPriceSummaries: vi.fn(async () => []) }));

import VejlePage from "../page";

afterEach(cleanup);

describe("/reparation-vejle FAQ schema", () => {
  it("mirrors every visible FAQ question", async () => {
    const { container } = render(await VejlePage());
    const faq = Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
      .map((s) => JSON.parse(s.textContent!))
      .find((b) => b["@type"] === "FAQPage");
    const visible = Array.from(container.querySelectorAll("details summary")).map((s) => s.textContent?.trim());
    expect(faq.mainEntity.length).toBe(visible.length);
    for (const q of faq.mainEntity) expect(visible.some((v) => v?.includes(q.name))).toBe(true);
  });
});

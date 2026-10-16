// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildTimeline } from "../case-timeline";
import { unpaidPickupNote } from "../pickup-guard";

describe("afhentet uden betaling på tidslinjen", () => {
  it("shows the amount and reason in Danish", () => {
    const tl = buildTimeline({
      ticket: { id: "t", created_at: "2026-10-01T10:00:00Z" },
      logs: [
        { id: "1", old_status: "faerdig", new_status: "afhentet", note: unpaidPickupNote(99_900, "Faktura til erhverv"), created_at: "2026-10-02T10:00:00Z" },
      ],
    });
    expect(tl[0].text).toContain("Afhentet uden betaling (999 kr. udestår): Faktura til erhverv");
  });
});

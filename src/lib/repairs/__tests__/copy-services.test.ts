// @vitest-environment node
import { describe, expect, it } from "vitest";
import { planServiceCopy, type SourceService } from "../copy-services";

const svc = (slug: string): SourceService => ({
  slug, name: slug, price_dkk: 999, estimated_minutes: 30, quality_tier: "standard", service_category: "Skærmskift",
  info_note: null, description: null, warranty_info: null, includes: null, estimated_time_label: null, sort_order: 1,
});

describe("planServiceCopy", () => {
  it("copies only what the model does not have, always inactive", () => {
    const rows = planServiceCopy("m2", [svc("skaerm"), svc("batteri")], ["batteri"]);
    expect(rows.map((r) => r.slug)).toEqual(["skaerm"]);
    expect(rows[0]).toMatchObject({ model_id: "m2", active: false, price_dkk: 999 });
  });
});

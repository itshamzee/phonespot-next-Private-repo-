import { describe, it, expect } from "vitest";
import { selectDisplaySpecs, findModelNumber } from "@/lib/product/spec-display";

describe("selectDisplaySpecs", () => {
  it("normalises Danish Title-Case keys (insert-script convention)", () => {
    const out = selectDisplaySpecs({
      Model: "A3241 (Mac16,13)",
      Processor: "Apple M4 — 10-core CPU, 10-core GPU",
      RAM: "24 GB unified memory",
      SSD: "512 GB",
      "Skærm": '15,3" Liquid Retina (2880×1864)',
      Farve: "Sky Blue",
      OS: "macOS",
      "Vægt": "1,51 kg",
    });
    const labels = out.map((s) => s.label);
    expect(labels).toContain("Processor");
    expect(labels).toContain("Hukommelse");
    expect(labels).toContain("Lager");
    expect(labels).toContain("Skærm");
    // "Model" is surfaced separately as the model number, not as a spec row
    expect(labels).not.toContain("Model");
  });

  it("normalises snake_case Foxway keys to the same labels", () => {
    const out = selectDisplaySpecs({
      processor: "Intel Core i5-8250U",
      ram: "8 GB",
      storage: "512 GB",
      screen_size: "15.6",
      graphics: "Intel UHD 620",
      os: "Windows 11",
    });
    const labels = out.map((s) => s.label);
    expect(labels).toContain("Processor");
    expect(labels).toContain("Hukommelse");
    expect(labels).toContain("Lager");
  });

  it("caps the number of rows and keeps a stable priority order", () => {
    const out = selectDisplaySpecs(
      { processor: "x", ram: "y", storage: "z", os: "w", graphics: "g", screen_size: "13" },
      { limit: 3 },
    );
    expect(out).toHaveLength(3);
    expect(out[0].label).toBe("Processor");
  });

  it("passes unknown keys through with their original label rather than dropping them", () => {
    const out = selectDisplaySpecs({ Tastaturlayout: "Dansk" });
    expect(out).toEqual([{ label: "Tastaturlayout", value: "Dansk" }]);
  });

  it("returns an empty array for empty or nullish input without throwing", () => {
    expect(selectDisplaySpecs({})).toEqual([]);
    // @ts-expect-error deliberately passing null to prove runtime safety
    expect(selectDisplaySpecs(null)).toEqual([]);
  });
});

describe("findModelNumber", () => {
  it("extracts an Apple model number from the Model key", () => {
    expect(findModelNumber({ Model: "A3241 (Mac16,13)" })).toBe("A3241");
  });
  it("returns null when no model number is present", () => {
    expect(findModelNumber({ processor: "M4" })).toBeNull();
    expect(findModelNumber({})).toBeNull();
  });
});

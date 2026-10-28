import { describe, expect, it } from "vitest";
import { PUBLIC_TILBEHOER_DEVICES, TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { TYPE_ATTRIBUTES } from "@/lib/admin/products/attributes";

describe("TILBEHOER_DEVICES", () => {
  it("har unikke slugs", () => {
    expect(new Set(TILBEHOER_DEVICES.map((d) => d.slug)).size).toBe(TILBEHOER_DEVICES.length);
  });

  it("har ældre modeller fra kasserne som legacy", () => {
    for (const slug of ["samsung-s8", "samsung-s20-ultra", "samsung-a23", "iphone-6-6s"]) {
      expect(TILBEHOER_DEVICES.find((d) => d.slug === slug)?.legacy).toBe(true);
    }
  });

  it("markerer ikke eksisterende modeller som legacy", () => {
    expect(TILBEHOER_DEVICES.find((d) => d.slug === "iphone-11-pro-max")?.legacy).toBeFalsy();
  });

  it("PUBLIC_TILBEHOER_DEVICES udelader legacy", () => {
    expect(PUBLIC_TILBEHOER_DEVICES.some((d) => d.legacy)).toBe(false);
    expect(PUBLIC_TILBEHOER_DEVICES.length).toBeGreaterThan(50);
  });
});

describe("TYPE_ATTRIBUTES", () => {
  it("cover og glas tillader udsalg, genuine og ai_read_text", () => {
    for (const type of ["cover", "screen_protector"]) {
      for (const key of ["udsalg", "genuine", "ai_read_text"]) {
        expect(TYPE_ATTRIBUTES[type].some((f) => f.key === key)).toBe(true);
      }
    }
  });
});

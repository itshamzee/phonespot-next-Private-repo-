import { describe, it, expect } from "vitest";
import { greenUrl } from "../green-link";

describe("greenUrl", () => {
  it("returns an https URL on green.dk", () => {
    const url = new URL(greenUrl("Apple", "iPhone 14", "128 GB"));
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("www.green.dk");
  });

  it("never throws on odd input", () => {
    expect(() => greenUrl("", "", undefined)).not.toThrow();
  });
});

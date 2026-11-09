import { describe, it, expect } from "vitest";
import { greenUrl } from "../green-link";

describe("greenUrl", () => {
  it("is an https Google search restricted to green.dk with the encoded model", () => {
    const raw = greenUrl("Apple", "iPhone 14", "128 GB");
    const url = new URL(raw);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("www.google.com");
    expect(url.searchParams.get("q")).toBe("site:green.dk Apple iPhone 14 128 GB");
    expect(raw).toContain(encodeURIComponent("iPhone 14"));
  });

  it("skips empty parts", () => {
    expect(new URL(greenUrl("Apple", "iPhone 14")).searchParams.get("q")).toBe("site:green.dk Apple iPhone 14");
  });
});

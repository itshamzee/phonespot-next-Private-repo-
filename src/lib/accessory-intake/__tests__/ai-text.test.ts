import { describe, expect, it } from "vitest";
import { aiTextIsStale } from "../ai-text";

describe("aiTextIsStale", () => {
  it("falsk når modellerne er dem AI'en valgte", () => {
    expect(aiTextIsStale(["iphone-13"], ["iphone-13"])).toBe(false);
    expect(aiTextIsStale(["iphone-12", "iphone-12-pro"], ["iphone-12-pro", "iphone-12"])).toBe(false);
  });
  it("sand når praktikanten har valgt en anden model", () => {
    expect(aiTextIsStale(["iphone-13"], ["iphone-14"])).toBe(true);
    expect(aiTextIsStale([], ["iphone-14"])).toBe(true);
  });
});

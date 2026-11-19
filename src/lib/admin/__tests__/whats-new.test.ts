import { describe, expect, it } from "vitest";
import { unseenEntries, WHATS_NEW, type WhatsNewEntry } from "../whats-new";

const e = (id: string, ownerOnly?: boolean): WhatsNewEntry => ({
  id,
  date: "2026-11-19",
  title: id,
  items: [{ text: "x" }],
  ...(ownerOnly ? { ownerOnly } : {}),
});

describe("unseenEntries", () => {
  const all = [e("c"), e("b", true), e("a")];

  it("returnerer alt, når intet er set, og bevarer rækkefølgen", () => {
    expect(unseenEntries(all, [], true).map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
  it("skjuler sete poster", () => {
    expect(unseenEntries(all, ["c", "a"], true).map((x) => x.id)).toEqual(["b"]);
  });
  it("skjuler ownerOnly for medarbejdere", () => {
    expect(unseenEntries(all, [], false).map((x) => x.id)).toEqual(["c", "a"]);
  });
  it("giver tom liste, når alt er set", () => {
    expect(unseenEntries(all, ["a", "b", "c"], true)).toEqual([]);
  });
});

describe("WHATS_NEW", () => {
  it("har unikke id'er og nyeste først", () => {
    const ids = WHATS_NEW.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(WHATS_NEW[0]?.id).toBe("2026-11-19-mapper-fiks");
  });
});

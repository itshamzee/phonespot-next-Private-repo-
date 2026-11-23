import { describe, expect, it } from "vitest";
import { statRange, parseStatQuery, nowBlockRanges, shiftRange } from "../range";

const at = (iso: string) => new Date(iso);

describe("shiftRange", () => {
  const now = at("2026-11-18T13:32:00Z");
  const today = "2026-11-18";
  const min = "2026-03-10";
  const custom = (from: string, to: string) => statRange({ from, to }, now);

  it("one day back from today gives yesterday", () => {
    expect(shiftRange(statRange("idag", now), -1, today, min)).toEqual({ fra: "2026-11-17", til: "2026-11-17" });
  });
  it("one day forward from yesterday gives today", () => {
    expect(shiftRange(statRange("igaar", now), 1, today, min)).toEqual({ fra: "2026-11-18", til: "2026-11-18" });
  });
  it("forward from a range ending today is null", () => {
    expect(shiftRange(statRange("idag", now), 1, today, min)).toBeNull();
    expect(shiftRange(statRange("7d", now), 1, today, min)).toBeNull();
  });
  it("7d back gives the 7 days before", () => {
    expect(shiftRange(statRange("7d", now), -1, today, min)).toEqual({ fra: "2026-11-05", til: "2026-11-11" });
  });
  it("a forward step that would pass today lands on til = today with the same length", () => {
    expect(shiftRange(custom("2026-11-10", "2026-11-16"), 1, today, min)).toEqual({ fra: "2026-11-12", til: "2026-11-18" });
  });
  it("back at minDate is null; close to minDate shifts less and keeps the length", () => {
    expect(shiftRange(custom("2026-03-10", "2026-03-12"), -1, today, min)).toBeNull();
    expect(shiftRange(custom("2026-03-12", "2026-03-14"), -1, today, min)).toEqual({ fra: "2026-03-10", til: "2026-03-12" });
  });
  it("aar is null both ways", () => {
    const aar = statRange("aar", now);
    expect(shiftRange(aar, -1, today, min)).toBeNull();
    expect(shiftRange(aar, 1, today, min)).toBeNull();
  });
  it("moves by whole calendar days across the 29 Mar 2026 spring DST change", () => {
    expect(shiftRange(custom("2026-03-29", "2026-03-29"), -1, today, min)).toEqual({ fra: "2026-03-28", til: "2026-03-28" });
    expect(shiftRange(custom("2026-03-29", "2026-03-29"), 1, today, min)).toEqual({ fra: "2026-03-30", til: "2026-03-30" });
    expect(shiftRange(custom("2026-03-26", "2026-04-01"), -1, today, min)).toEqual({ fra: "2026-03-19", til: "2026-03-25" });
    expect(shiftRange(custom("2026-03-26", "2026-04-01"), 1, today, min)).toEqual({ fra: "2026-04-02", til: "2026-04-08" });
  });
  it("moves by whole calendar days across the 25 Oct 2026 DST change", () => {
    expect(shiftRange(custom("2026-10-25", "2026-10-25"), -1, today, min)).toEqual({ fra: "2026-10-24", til: "2026-10-24" });
    expect(shiftRange(custom("2026-10-25", "2026-10-25"), 1, today, min)).toEqual({ fra: "2026-10-26", til: "2026-10-26" });
    expect(shiftRange(custom("2026-10-22", "2026-10-28"), -1, today, min)).toEqual({ fra: "2026-10-15", til: "2026-10-21" });
    expect(shiftRange(custom("2026-10-22", "2026-10-28"), 1, today, min)).toEqual({ fra: "2026-10-29", til: "2026-11-04" });
  });
});

describe("single-day ranges", () => {
  const now = at("2026-11-18T13:32:00Z"); // onsdag 14:32 dansk

  it("a past custom day reads with the weekday and compares with the full day before", () => {
    const r = statRange({ from: "2026-11-17", to: "2026-11-17" }, now);
    expect(r.rangeLabel).toBe("Tirsdag 17. nov. 2026");
    expect(r.compareLabel).toBe("mod dagen før");
    expect(r.prev).toEqual({ startIso: "2026-11-15T23:00:00.000Z", endIso: "2026-11-16T23:00:00.000Z" });
  });
  it("a custom day that is today compares with yesterday up to the same time", () => {
    const r = statRange({ from: "2026-11-18", to: "2026-11-18" }, now);
    expect(r.rangeLabel).toBe("Onsdag 18. nov. 2026");
    expect(r.compareLabel).toBe("mod i går samme tid");
    expect(r.prev).toEqual({ startIso: "2026-11-16T23:00:00.000Z", endIso: "2026-11-17T13:32:00.000Z" });
  });
  it("the I dag and I går presets also carry the weekday", () => {
    expect(statRange("idag", now).rangeLabel).toBe("Onsdag 18. nov. 2026");
    expect(statRange("igaar", now).rangeLabel).toBe("Tirsdag 17. nov. 2026");
  });
  it("multi-day labels are unchanged", () => {
    expect(statRange("7d", now).rangeLabel).toBe("12. nov. – 18. nov. 2026");
  });
});

describe("statRange", () => {
  it("idag compares with yesterday up to the same time", () => {
    const r = statRange("idag", at("2026-11-18T13:32:00Z")); // 14:32 dansk
    expect(r.startIso).toBe("2026-11-17T23:00:00.000Z");
    expect(r.prev).toEqual({ startIso: "2026-11-16T23:00:00.000Z", endIso: "2026-11-17T13:32:00.000Z" });
    expect(r.unit).toBe("time");
    expect(r.buckets).toHaveLength(24);
  });
  it("30d covers 30 Danish days ending today and compares with the 30 before", () => {
    const r = statRange("30d", at("2026-11-18T13:32:00Z"));
    expect(r.from).toBe("2026-10-20"); expect(r.to).toBe("2026-11-18");
    expect(r.buckets).toHaveLength(30);
    expect(r.prev!.startIso).toBe("2026-09-19T22:00:00.000Z"); // sommertid
  });
  it("keeps whole days across the autumn DST change", () => {
    const r = statRange({ from: "2026-10-24", to: "2026-10-26" }, at("2026-11-18T12:00:00Z"));
    const hours = r.buckets.map((b) => (Date.parse(b.endIso) - Date.parse(b.startIso)) / 3_600_000);
    expect(hours).toEqual([24, 25, 24]);
  });
  it("hourly buckets on the DST day cover 25 hours without gaps", () => {
    const r = statRange({ from: "2026-10-25", to: "2026-10-25" }, at("2026-11-18T12:00:00Z"));
    expect(r.buckets[0].startIso).toBe(r.startIso);
    expect(r.buckets.at(-1)!.endIso).toBe(r.endIso);
    for (let i = 1; i < r.buckets.length; i++) expect(r.buckets[i].startIso).toBe(r.buckets[i - 1].endIso);
  });
  it("aar has monthly buckets and no comparison", () => {
    const r = statRange("aar", at("2026-11-18T12:00:00Z"));
    expect(r.unit).toBe("maaned"); expect(r.prev).toBeNull(); expect(r.buckets).toHaveLength(11);
  });
});

describe("parseStatQuery", () => {
  const now = at("2026-11-18T12:00:00Z");
  it("falls back to 30d on garbage", () => {
    expect(parseStatQuery({ periode: "x", fra: "nope" }, now, "2026-03-10").preset).toBe("30d");
  });
  it("swaps reversed dates and clamps to data start and today", () => {
    const r = parseStatQuery({ fra: "2027-01-01", til: "2025-01-01" }, now, "2026-03-10");
    expect(r.preset).toBe("valg"); expect(r.from).toBe("2026-03-10"); expect(r.to).toBe("2026-11-18");
  });
});

describe("nowBlockRanges", () => {
  it("month compares the 1st-to-now span with the same span last month", () => {
    const { maaned } = nowBlockRanges(at("2026-11-18T13:32:00Z"));
    expect(maaned.from).toBe("2026-11-01");
    expect(maaned.prev).toEqual({ startIso: "2026-09-30T22:00:00.000Z", endIso: "2026-10-18T12:32:00.000Z" });
  });
});

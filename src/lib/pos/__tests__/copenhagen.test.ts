import { describe, it, expect } from "vitest";
import { copenhagenDateString, copenhagenDayBounds, isValidDateString } from "../copenhagen";

describe("copenhagenDayBounds", () => {
  it("summer day (CEST, UTC+2) starts at 22:00Z the evening before", () => {
    expect(copenhagenDayBounds("2026-10-01")).toEqual({
      startIso: "2026-09-30T22:00:00.000Z",
      endIso: "2026-10-01T22:00:00.000Z",
    });
  });

  it("winter day (CET, UTC+1) starts at 23:00Z the evening before", () => {
    expect(copenhagenDayBounds("2026-01-15")).toEqual({
      startIso: "2026-01-14T23:00:00.000Z",
      endIso: "2026-01-15T23:00:00.000Z",
    });
  });

  it("handles the 25-hour day when summer time ends", () => {
    const b = copenhagenDayBounds("2026-10-25");
    expect(b).toEqual({ startIso: "2026-10-24T22:00:00.000Z", endIso: "2026-10-25T23:00:00.000Z" });
    expect((Date.parse(b.endIso) - Date.parse(b.startIso)) / 3600000).toBe(25);
  });

  it("handles the 23-hour day when summer time starts", () => {
    const b = copenhagenDayBounds("2026-03-29");
    expect(b).toEqual({ startIso: "2026-03-28T23:00:00.000Z", endIso: "2026-03-29T22:00:00.000Z" });
    expect((Date.parse(b.endIso) - Date.parse(b.startIso)) / 3600000).toBe(23);
  });

  it("consecutive days tile without gaps or overlap", () => {
    expect(copenhagenDayBounds("2026-10-01").endIso).toBe(copenhagenDayBounds("2026-10-02").startIso);
    expect(copenhagenDayBounds("2026-12-31").endIso).toBe(copenhagenDayBounds("2027-01-01").startIso);
  });

  it("a sale at 00:30 Danish time belongs to the new day, not the previous UTC day", () => {
    const sale = Date.parse("2026-10-01T22:30:00.000Z"); // 00:30 on 2 Oct in Copenhagen
    const oct1 = copenhagenDayBounds("2026-10-01");
    const oct2 = copenhagenDayBounds("2026-10-02");
    expect(sale >= Date.parse(oct1.startIso) && sale < Date.parse(oct1.endIso)).toBe(false);
    expect(sale >= Date.parse(oct2.startIso) && sale < Date.parse(oct2.endIso)).toBe(true);
  });

  it("rejects malformed and impossible dates", () => {
    expect(() => copenhagenDayBounds("2026-02-30")).toThrow();
    expect(() => copenhagenDayBounds("01-10-2026")).toThrow();
    expect(isValidDateString("2026-10-01")).toBe(true);
    expect(isValidDateString("2026-13-01")).toBe(false);
  });
});

describe("copenhagenDateString", () => {
  it("uses the Copenhagen calendar date", () => {
    expect(copenhagenDateString("2026-10-01T21:59:59.000Z")).toBe("2026-10-01");
    expect(copenhagenDateString("2026-10-01T22:00:00.000Z")).toBe("2026-10-02");
    expect(copenhagenDateString("2026-01-15T22:59:59.000Z")).toBe("2026-01-15");
    expect(copenhagenDateString("2026-01-15T23:00:00.000Z")).toBe("2026-01-16");
  });
});

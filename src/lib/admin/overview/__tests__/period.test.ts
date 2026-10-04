import { describe, expect, it } from "vitest";
import { addDays, addMonths, parsePeriod, periodRange, OVERBLIK_PERIODS } from "../period";

// Søndag 4. oktober 2026, 12:00 dansk sommertid
const SUNDAY_NOON = new Date("2026-10-04T10:00:00Z");

describe("periodRange (Europe/Copenhagen)", () => {
  it("dag: fra dansk midnat til næste dansk midnat (sommertid = UTC+2)", () => {
    const r = periodRange("dag", SUNDAY_NOON);
    expect(r.today).toBe("2026-10-04");
    expect(r.startIso).toBe("2026-10-03T22:00:00.000Z");
    expect(r.endIso).toBe("2026-10-04T22:00:00.000Z");
  });

  it("et salg kl. 00:30 dansk tid hører til den nye dag, ikke gårsdagen", () => {
    const r = periodRange("dag", new Date("2026-10-04T22:30:00Z")); // mandag 5. okt. 00:30
    expect(r.today).toBe("2026-10-05");
    expect(r.startIso).toBe("2026-10-04T22:00:00.000Z");
  });

  it("uge: starter mandag, også når i dag er søndag", () => {
    const r = periodRange("uge", SUNDAY_NOON);
    expect(r.startIso).toBe("2026-09-27T22:00:00.000Z"); // mandag 28. sep.
    expect(r.endIso).toBe("2026-10-04T22:00:00.000Z"); // næste mandag 5. okt.
  });

  it("måned: slutter i vintertid efter skiftet 25. oktober", () => {
    const r = periodRange("maaned", SUNDAY_NOON);
    expect(r.startIso).toBe("2026-09-30T22:00:00.000Z");
    expect(r.endIso).toBe("2026-10-31T23:00:00.000Z"); // 1. nov. 00:00 = UTC+1
  });

  it("ugen med sommertid-skiftet er 7 døgn + 1 time lang", () => {
    const after = periodRange("uge", new Date("2026-10-26T09:00:00Z")); // mandag efter skiftet
    expect(after.startIso).toBe("2026-10-25T23:00:00.000Z");
    const during = periodRange("uge", new Date("2026-10-22T09:00:00Z"));
    const hours = (Date.parse(during.endIso) - Date.parse(during.startIso)) / 3_600_000;
    expect(hours).toBe(7 * 24 + 1);
  });

  it("kvartal og år", () => {
    expect(periodRange("kvartal", SUNDAY_NOON).startIso).toBe("2026-09-30T22:00:00.000Z"); // 1. okt.
    expect(periodRange("aar", SUNDAY_NOON).startIso).toBe("2025-12-31T23:00:00.000Z");
    expect(periodRange("aar", SUNDAY_NOON).endIso).toBe("2026-12-31T23:00:00.000Z");
  });

  it("sammenligner med samme forløb i forrige periode", () => {
    const day = periodRange("dag", SUNDAY_NOON);
    expect(day.compareLabel).toBe("mod sidste søndag");
    expect(day.prevStartIso).toBe("2026-09-26T22:00:00.000Z");
    expect(day.prevEndIso).toBe("2026-09-27T10:00:00.000Z"); // kun de første 12 timer

    const now = new Date("2026-10-15T10:00:00Z");
    const month = periodRange("maaned", now);
    expect(month.prevStartIso).toBe("2026-08-31T22:00:00.000Z");
    expect(Date.parse(month.prevEndIso) - Date.parse(month.prevStartIso)).toBe(
      now.getTime() - Date.parse(month.startIso),
    );
  });

  it("afkorter ikke forrige periode ud over dens slutning", () => {
    const march = periodRange("maaned", new Date("2027-03-31T10:00:00Z")); // februar har kun 28 dage
    expect(march.prevEndIso).toBe(march.startIso);
  });

  it("årsskifte", () => {
    const r = periodRange("maaned", new Date("2027-01-15T10:00:00Z"));
    expect(r.startIso).toBe("2026-12-31T23:00:00.000Z");
    expect(r.prevStartIso).toBe("2026-11-30T23:00:00.000Z");
  });
});

describe("hjælpere", () => {
  it("addDays og addMonths over måneds- og årsgrænser", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
  });

  it("parsePeriod accepterer kun tilladte værdier", () => {
    expect(parsePeriod("uge", OVERBLIK_PERIODS, "dag")).toBe("uge");
    expect(parsePeriod("kvartal", OVERBLIK_PERIODS, "dag")).toBe("dag");
    expect(parsePeriod(undefined, OVERBLIK_PERIODS, "dag")).toBe("dag");
  });
});

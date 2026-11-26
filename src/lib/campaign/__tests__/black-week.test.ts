import { describe, expect, it } from "vitest";
import { BLACK_WEEK, blackWeekGiftNote, hasBlackWeekGift, isBlackWeek, isGiftModel } from "../black-week";

const during = Date.parse("2026-11-27T12:00:00+01:00");

describe("Black Week", () => {
  it("kører 26.–30. november dansk tid", () => {
    expect(isBlackWeek(BLACK_WEEK.startsAt - 1)).toBe(false);
    expect(isBlackWeek(BLACK_WEEK.startsAt)).toBe(true);
    expect(isBlackWeek(Date.parse("2026-11-30T23:59:59+01:00"))).toBe(true);
    expect(isBlackWeek(Date.parse("2026-12-01T00:00:00+01:00"))).toBe(false);
  });

  it("giver kun gaven til iPhones", () => {
    expect(isGiftModel("iPhone 15 Pro")).toBe(true);
    expect(isGiftModel("Apple iPhone 16e")).toBe(true);
    expect(isGiftModel("iPad Air M2")).toBe(false);
    expect(isGiftModel("MacBook Air 15 M4")).toBe(false);
    expect(isGiftModel(null)).toBe(false);
    expect(hasBlackWeekGift("iPhone 13", during)).toBe(true);
    expect(hasBlackWeekGift("iPhone 13", BLACK_WEEK.endsAt)).toBe(false);
  });

  it("skriver én notelinje pr. iPhone og intet uden iPhone", () => {
    expect(blackWeekGiftNote(["iPhone 15", "ThinkPad T14", "iPhone 13 Mini"], during)).toBe(
      "Black Week-gave: beskyttelsesglas + gennemsigtigt cover til iPhone 15 (0 kr.)\n" +
        "Black Week-gave: beskyttelsesglas + gennemsigtigt cover til iPhone 13 Mini (0 kr.)",
    );
    expect(blackWeekGiftNote(["ThinkPad T14", null], during)).toBeNull();
    expect(blackWeekGiftNote(["iPhone 15"], BLACK_WEEK.endsAt)).toBeNull();
  });
});

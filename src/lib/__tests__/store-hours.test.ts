import { describe, it, expect } from "vitest";
import { getOpenStatus } from "../store-hours";
import { STORES } from "../store-config";

// Oktober 2026: CEST (UTC+2). 2026-10-14 er en onsdag, 2026-10-17 en lørdag.
const at = (iso: string) => new Date(iso);

describe("getOpenStatus", () => {
  const slagelse = STORES.slagelse.hours; // 10-19 / 10-17 / 10-17
  const vejle = STORES.vejle.hours; // 10-17:30 / 10-15 / 10-15

  it("is open on a weekday afternoon", () => {
    expect(getOpenStatus(slagelse, at("2026-10-14T12:00:00Z"))).toEqual({
      open: true,
      label: "Åbent nu · lukker kl. 19:00",
    });
  });

  it("is closed before opening and names today", () => {
    expect(getOpenStatus(vejle, at("2026-10-14T06:00:00Z"))?.label).toBe("Lukket · åbner i dag kl. 10:00");
  });

  it("is closed after closing and names tomorrow", () => {
    expect(getOpenStatus(vejle, at("2026-10-14T16:00:00Z"))?.label).toBe("Lukket · åbner i morgen kl. 10:00");
  });

  it("uses Copenhagen time, not UTC", () => {
    // 15:45 UTC = 17:45 lokal tid -> Vejle (lukker 17:30) er lukket.
    expect(getOpenStatus(vejle, at("2026-10-14T15:45:00Z"))?.open).toBe(false);
    // 15:15 UTC = 17:15 lokal tid -> åbent.
    expect(getOpenStatus(vejle, at("2026-10-14T15:15:00Z"))?.label).toBe("Åbent nu · lukker kl. 17:30");
  });

  it("uses Saturday hours", () => {
    expect(getOpenStatus(vejle, at("2026-10-17T14:00:00Z"))?.label).toBe("Lukket · åbner i morgen kl. 10:00");
    expect(getOpenStatus(vejle, at("2026-10-17T10:00:00Z"))?.label).toBe("Åbent nu · lukker kl. 15:00");
  });
});

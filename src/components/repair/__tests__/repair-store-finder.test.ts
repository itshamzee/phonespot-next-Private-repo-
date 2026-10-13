import { describe, expect, it } from "vitest";
import { openStatus } from "@/components/repair/repair-store-finder";

const hours = { weekdays: "10:00 – 17:30", saturday: "10:00 – 15:00", sunday: "10:00 – 15:00" };
// Tidspunkterne er UTC; oktober er sommertid (UTC+2) i København.
describe("openStatus", () => {
  it("is open during weekday hours", () => {
    expect(openStatus(hours, new Date("2026-10-13T12:00:00Z"))).toEqual({ open: true, label: "Åbent nu til 17.30" });
  });
  it("tells when it opens before opening time", () => {
    expect(openStatus(hours, new Date("2026-10-13T06:00:00Z")).label).toBe("Åbner i dag kl. 10.00");
  });
  it("points to tomorrow after closing", () => {
    expect(openStatus(hours, new Date("2026-10-13T17:00:00Z"))).toEqual({ open: false, label: "Lukket · åbner i morgen kl. 10.00" });
  });
  it("uses saturday hours", () => {
    expect(openStatus(hours, new Date("2026-10-17T13:30:00Z")).open).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { getDispatchCountdown } from "../dispatch-countdown";

describe("Daglig afsendelsesfrist i Danmark", () => {
  it("tæller ned til dansk kl. 16 både sommer og vinter", () => {
    expect(getDispatchCountdown(new Date("2026-09-13T13:59:30Z"))).toBe("00:00:30");
    expect(getDispatchCountdown(new Date("2026-12-13T14:59:30Z"))).toBe("00:00:30");
  });
  it("lover ikke afsendelse i dag ved eller efter fristen", () => {
    expect(getDispatchCountdown(new Date("2026-09-13T14:00:00Z"))).toBeNull();
    expect(getDispatchCountdown(new Date("2026-09-13T21:00:00Z"))).toBeNull();
  });
  it("starter forfra ved midnat og tæller også i weekenden", () => {
    expect(getDispatchCountdown(new Date("2026-09-12T22:00:00Z"))).toBe("16:00:00");
    expect(getDispatchCountdown(new Date("2026-09-12T10:00:00Z"))).toBe("04:00:00");
  });
  it("følger dansk tid over begge skift mellem sommer- og vintertid", () => {
    expect(getDispatchCountdown(new Date("2026-03-29T01:00:00Z"))).toBe("13:00:00");
    expect(getDispatchCountdown(new Date("2026-10-25T01:00:00Z"))).toBe("14:00:00");
  });
});

import { describe, it, expect } from "vitest";
import { resolveUpgrades, type AllowedUpgrade } from "../upgrades";

const allowed: AllowedUpgrade[] = [
  { id: "u1", kind: "ram", label: "Opgrader til 32 GB RAM (inkl. montering)", price: 59900 },
  { id: "u2", kind: "ssd", label: "Opgrader til 1 TB SSD (inkl. montering)", price: 79900 },
];

describe("resolveUpgrades", () => {
  it("erstatter klientens pris og label med serverens", () => {
    const r = resolveUpgrades(
      [{ optionId: "u1", kind: "ram", label: "hacket", price: 1 }],
      allowed,
    );
    expect(r.error).toBeNull();
    expect(r.upgrades).toEqual([{ optionId: "u1", kind: "ram", label: allowed[0].label, price: 59900 }]);
  });
  it("afviser option der ikke er tilladt for modellen", () => {
    const r = resolveUpgrades([{ optionId: "ukendt", kind: "ram", label: "", price: 0 }], allowed);
    expect(r.error).toBeTruthy();
    expect(r.upgrades).toEqual([]);
  });
  it("afviser to valg af samme kind", () => {
    const r = resolveUpgrades(
      [
        { optionId: "u1", kind: "ram", label: "", price: 0 },
        { optionId: "u1", kind: "ram", label: "", price: 0 },
      ],
      allowed,
    );
    expect(r.error).toBeTruthy();
  });
  it("tom liste er gyldig", () => {
    expect(resolveUpgrades([], allowed)).toEqual({ upgrades: [], error: null });
  });
});

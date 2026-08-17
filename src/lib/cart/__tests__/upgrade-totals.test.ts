import { describe, it, expect } from "vitest";
import { lineTotal, calcSubtotal } from "../utils";
import type { CartDeviceItem } from "../types";

const device: CartDeviceItem = {
  type: "device",
  deviceId: "d1",
  templateId: "t1",
  title: "ThinkPad T14 G2",
  grade: "A",
  color: "Sort",
  storage: "256GB SSD",
  image: null,
  price: 500000,
  reservedAt: "2026-08-17T00:00:00Z",
};

describe("lineTotal med opgraderinger", () => {
  it("uden opgraderinger er lineTotal = price", () => {
    expect(lineTotal(device)).toBe(500000);
  });
  it("laegger opgraderingspriser til device-linjen", () => {
    const withUpgrades: CartDeviceItem = {
      ...device,
      upgrades: [
        {
          optionId: "u1",
          kind: "ram",
          label: "Opgrader til 32 GB RAM (inkl. montering)",
          price: 59900,
        },
        {
          optionId: "u2",
          kind: "ssd",
          label: "Opgrader til 1 TB SSD (inkl. montering)",
          price: 79900,
        },
      ],
    };
    expect(lineTotal(withUpgrades)).toBe(500000 + 59900 + 79900);
    expect(calcSubtotal([withUpgrades])).toBe(639800);
  });
});

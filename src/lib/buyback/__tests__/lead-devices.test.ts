import { describe, it, expect } from "vitest";
import { readLeadDevices, deviceLabel } from "../lead-devices";

const dev = { deviceType: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB", ram: "", useCustom: false, brandCustom: "", modelCustom: "" };
const con = { screen: "Perfekt", back: "Perfekt", battery: "God (80%+)", allWorking: "Ja", brokenParts: [], cloudLocked: "Nej" };

describe("readLeadDevices", () => {
  it("reads the current devices[] shape", () => {
    const r = readLeadDevices({ devices: [{ device: dev, condition: con }] });
    expect(r).toHaveLength(1);
    expect(r[0].device.model).toBe("iPhone 12");
  });

  it("reads multiple devices in order", () => {
    const second = { ...dev, model: "iPhone 13" };
    const r = readLeadDevices({ devices: [{ device: dev, condition: con }, { device: second, condition: con }] });
    expect(r.map((e) => e.device.model)).toEqual(["iPhone 12", "iPhone 13"]);
  });

  it("reads the legacy device/condition shape", () => {
    const r = readLeadDevices({ device: dev, condition: con });
    expect(r).toHaveLength(1);
    expect(r[0].device.model).toBe("iPhone 12");
  });

  it("prefers devices[] when both shapes are present", () => {
    const r = readLeadDevices({ devices: [{ device: dev, condition: con }], device: { ...dev, model: "gammel" }, condition: con });
    expect(r[0].device.model).toBe("iPhone 12");
  });

  it("returns an empty array for null, undefined and junk", () => {
    expect(readLeadDevices(null)).toEqual([]);
    expect(readLeadDevices(undefined)).toEqual([]);
    expect(readLeadDevices("nope")).toEqual([]);
    expect(readLeadDevices({})).toEqual([]);
  });

  it("skips entries without a device object", () => {
    expect(readLeadDevices({ devices: [{ condition: con }] })).toEqual([]);
  });

  it("defaults missing condition fields rather than throwing", () => {
    const r = readLeadDevices({ devices: [{ device: dev }] });
    expect(r).toHaveLength(1);
    expect(r[0].condition.brokenParts).toEqual([]);
  });

  it("coerces non-string fields instead of trusting the JSON", () => {
    const r = readLeadDevices({ devices: [{ device: { ...dev, model: 12 }, condition: { ...con, brokenParts: ["Kamera", 7] } }] });
    expect(r[0].device.model).toBe("");
    expect(r[0].condition.brokenParts).toEqual(["Kamera"]);
  });
});

describe("deviceLabel", () => {
  it("joins brand, model and storage", () => {
    expect(deviceLabel(dev)).toBe("Apple iPhone 12 128GB");
  });

  it("skips missing parts", () => {
    expect(deviceLabel({ ...dev, storage: "" })).toBe("Apple iPhone 12");
  });

  it("falls back when there is nothing to show", () => {
    expect(deviceLabel(undefined)).toBe("Ukendt enhed");
    expect(deviceLabel({ ...dev, brand: "", model: "", storage: "" })).toBe("Ukendt enhed");
  });

  it("reads the typed values for a custom device", () => {
    const custom = { ...dev, brand: "", model: "", useCustom: true, brandCustom: "OnePlus", modelCustom: "Nord 3", storage: "256GB" };
    expect(deviceLabel(custom)).toBe("OnePlus Nord 3 256GB");
  });
});

import type { BuybackCondition, BuybackDevice } from "./types";

export interface LeadDevice {
  device: BuybackDevice;
  condition: BuybackCondition;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toDevice(raw: unknown): BuybackDevice | null {
  if (!isRecord(raw)) return null;
  return {
    deviceType: str(raw.deviceType),
    brand: str(raw.brand),
    model: str(raw.model),
    storage: str(raw.storage),
    ram: str(raw.ram),
    useCustom: raw.useCustom === true,
    brandCustom: str(raw.brandCustom),
    modelCustom: str(raw.modelCustom),
  };
}

function toCondition(raw: unknown): BuybackCondition {
  const r = isRecord(raw) ? raw : {};
  return {
    screen: str(r.screen),
    back: str(r.back),
    battery: str(r.battery),
    allWorking: str(r.allWorking),
    brokenParts: Array.isArray(r.brokenParts)
      ? r.brokenParts.filter((p): p is string => typeof p === "string")
      : [],
    cloudLocked: str(r.cloudLocked),
  };
}

// contact_inquiries.metadata has two historical shapes: the current
// `devices: [{ device, condition }]` written by the multi-device wizard, and the
// older flat `{ device, condition }`. Everything that reads a buyback lead goes
// through here so neither shape is silently dropped — reading only the old shape
// left brand and model blank on every lead since the wizard was updated.
export function readLeadDevices(metadata: unknown): LeadDevice[] {
  if (!isRecord(metadata)) return [];

  if (Array.isArray(metadata.devices)) {
    return metadata.devices
      .map((entry) => {
        const source = isRecord(entry) ? entry : {};
        const device = toDevice(source.device);
        return device ? { device, condition: toCondition(source.condition) } : null;
      })
      .filter((entry): entry is LeadDevice => entry !== null);
  }

  const device = toDevice(metadata.device);
  return device ? [{ device, condition: toCondition(metadata.condition) }] : [];
}

// "Apple iPhone 12 128GB" — the label used in admin lists, emails and events.
// When the customer picked "min enhed findes ikke", brand and model are empty and
// the typed values live in brandCustom/modelCustom, so the label must read those
// or the lead shows up blank.
export function deviceLabel(device: BuybackDevice | undefined): string {
  if (!device) return "Ukendt enhed";
  const brand = device.brand.trim() || device.brandCustom.trim();
  const model = device.model.trim() || device.modelCustom.trim();
  const label = [brand, model, device.storage.trim()].filter(Boolean).join(" ");
  return label || "Ukendt enhed";
}

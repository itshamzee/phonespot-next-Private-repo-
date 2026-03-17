export interface StaffProfile {
  id: string;
  user_id: string | null;
  display_name: string;
  title: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  id: boolean;
  logo_url: string | null;
  company_name: string;
  address: string | null;
  postal_city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShippingLabel {
  id: string;
  offer_id: string;
  provider: string;
  tracking_number: string | null;
  label_url: string;
  status: "label_created" | "in_transit" | "delivered";
  shipmondo_shipment_id: string | null;
  created_at: string;
  updated_at: string;
}

export type DeviceGuideType = "apple" | "android" | "windows" | "generic";

export function detectDeviceGuide(brand: string | undefined | null): DeviceGuideType {
  if (!brand) return "generic";
  const b = brand.toLowerCase();
  if (["apple", "iphone", "ipad", "mac", "macbook", "imac"].some(k => b.includes(k))) return "apple";
  if (["samsung", "huawei", "xiaomi", "oneplus", "google", "pixel", "oppo", "sony", "nokia", "motorola", "lg", "android"].some(k => b.includes(k))) return "android";
  if (["microsoft", "windows", "surface", "dell", "hp", "lenovo", "asus", "acer"].some(k => b.includes(k))) return "windows";
  return "generic";
}

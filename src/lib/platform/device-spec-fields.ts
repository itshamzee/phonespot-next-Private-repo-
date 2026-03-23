export interface SpecField {
  key: string;
  label: string;
  type: "chips" | "select" | "text";
  options?: string[];
  categories: string[];
}

export const DEVICE_SPEC_FIELDS: SpecField[] = [
  { key: "størrelse", label: "Størrelse", type: "chips", options: ["38mm", "40mm", "41mm", "42mm", "44mm", "45mm", "46mm", "47mm", "49mm"], categories: ["smartwatch"] },
  { key: "connectivity", label: "Forbindelse", type: "select", options: ["Wi-Fi", "Wi-Fi + Cellular", "LTE", "5G"], categories: ["smartwatch", "ipad", "tablet"] },
  { key: "skærm", label: "Skærmstørrelse", type: "text", categories: ["iphone", "smartphone", "ipad", "tablet", "laptop"] },
  { key: "ram", label: "RAM", type: "chips", options: ["4GB", "8GB", "16GB", "32GB", "64GB"], categories: ["laptop"] },
  { key: "processor", label: "Processor", type: "text", categories: ["laptop"] },
  { key: "chip", label: "Chip", type: "select", options: ["M1", "M2", "M3", "M4", "M1 Pro", "M1 Max", "M2 Pro", "M2 Max", "M3 Pro", "M3 Max", "M4 Pro", "M4 Max"], categories: ["laptop"] },
  { key: "lagertype", label: "Lagertype", type: "chips", options: ["SSD", "HDD", "eMMC"], categories: ["laptop"] },
];

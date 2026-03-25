import type { DeviceGrade } from "@/lib/supabase/platform-types";

export interface FoxwayRawRow {
  ITEMNO: string;
  MODEL: string;
  DESCIPTION: string; // Note: Foxway typo, not "DESCRIPTION"
  ONSTOCK: string;
  PRICE: string;
  COND: string;
  PROD: string;
  ITEMGROUP: string;
  WARRANTY: string;
  WARRANTYDESC: string;
  SW: string;
  KB: string;
  CATAGORY: string; // Note: Foxway typo, not "CATEGORY"
  PRODID: string;
  EAN: string;
  BLUETOOTH: string;
  RESOLUTION: string;
  SCREENSIZE: string;
  HDD01: string;
  HDD02: string;
  MEMORYTOTAL: string;
  GRAPHICS01: string;
  GRAPHICS02: string;
  PROCESSOR: string;
  OS: string;
  WIRELESS: string;
  DISPLAYTYPE: string;
  COLOR: string;
  DCCURL: string;
  ETAQUANTITY: string;
  ETADATE: string;
  WIN11READY: string;
  REMOTESTOCK: string;
}

export interface FoxwayParsedItem {
  sourceSku: string;
  model: string;
  brand: string;
  description: string;
  stock: number;
  buyPrice: number; // in ore (DKK cents)
  grade: DeviceGrade;
  processor: string;
  ram: string;
  storage: string;
  screenSize: string;
  resolution: string;
  graphics: string;
  color: string;
  os: string;
  displayType: string;
  ean: string;
  warranty: string;
  foxwayUrl: string;
}

export interface FoxwayParseResult {
  items: FoxwayParsedItem[];
  skipped: number;
  errors: { row: number; reason: string }[];
  totalRows: number;
}

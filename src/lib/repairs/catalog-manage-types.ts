/** Typer til kataloghåndteringen (Varer, Reparationer). Delt mellem API, server og UI. */
import type { RepairServiceOption } from "@/lib/repairs/new-case-types";

export type ManageModelNode = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  active: boolean;
  series: string | null;
  /** Aktive reparationer med pris over 0: det hjemmesiden og Ny sag faktisk viser. */
  live_services: number;
  total_services: number;
};

export type ManageSeriesNode = { name: string; models: ManageModelNode[] };

export type ManageBrandNode = {
  id: string;
  slug: string;
  name: string;
  device_type: string;
  series: ManageSeriesNode[];
};

export type ManageParentNode = { key: string; name: string; brands: ManageBrandNode[] };

export type ManageTreeResponse = { parents: ManageParentNode[] };

export type ManageService = RepairServiceOption & {
  active: boolean;
  sort_order: number;
};

export type ManageCategory = { name: string; services: ManageService[] };

export type ManageModelResponse = {
  model: {
    id: string;
    slug: string;
    name: string;
    series: string | null;
    image_url: string | null;
    active: boolean;
    brand_id: string;
    brand_name: string;
    brand_slug: string;
    device_type: string;
  };
  categories: ManageCategory[];
  summary: { total: number; active: number; live: number; priced_inactive: number };
};

export type PartStockResponse = {
  sku_product_id: string;
  title: string | null;
  tracked: boolean;
  cost_oere: number | null;
  stores: Array<{ slug: "vejle" | "slagelse"; name: string; quantity: number; reserved: number; can_edit: boolean }>;
};

export type DeviceType = "smartphone" | "tablet" | "laptop" | "watch" | "console";

export interface RepairBrand {
  id: string;
  slug: string;
  name: string;
  device_type: DeviceType;
  logo_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface RepairModel {
  id: string;
  brand_id: string;
  slug: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface RepairService {
  id: string;
  model_id: string;
  slug: string;
  name: string;
  price_dkk: number;
  estimated_minutes: number | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export type RepairStatus =
  | "modtaget"
  | "tilbud_sendt"
  | "godkendt"
  | "i_gang"
  | "faerdig"
  | "afhentet";

export interface RepairTicket {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  device_type: string;
  device_model: string;
  issue_description: string;
  service_type: string;
  status: RepairStatus;
  created_at: string;
  updated_at: string;
}

export interface RepairQuote {
  id: string;
  ticket_id: string;
  price_dkk: number;
  estimated_days: number | null;
  notes: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  created_at: string;
}

export interface RepairStatusLog {
  id: string;
  ticket_id: string;
  old_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      repair_tickets: {
        Row: RepairTicket;
        Insert: Omit<RepairTicket, "id" | "created_at" | "updated_at" | "status">;
        Update: Partial<RepairTicket>;
      };
      repair_quotes: {
        Row: RepairQuote;
        Insert: Omit<RepairQuote, "id" | "created_at">;
        Update: Partial<RepairQuote>;
      };
      repair_status_log: {
        Row: RepairStatusLog;
        Insert: Omit<RepairStatusLog, "id" | "created_at">;
        Update: Partial<RepairStatusLog>;
      };
      repair_brands: {
        Row: RepairBrand;
        Insert: Omit<RepairBrand, "id" | "created_at">;
        Update: Partial<RepairBrand>;
      };
      repair_models: {
        Row: RepairModel;
        Insert: Omit<RepairModel, "id" | "created_at">;
        Update: Partial<RepairModel>;
      };
      repair_services: {
        Row: RepairService;
        Insert: Omit<RepairService, "id" | "created_at">;
        Update: Partial<RepairService>;
      };
    };
  };
}

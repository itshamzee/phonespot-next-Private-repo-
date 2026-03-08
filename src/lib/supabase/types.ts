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
  series: string | null;
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
  | "diagnostik"
  | "tilbud_sendt"
  | "godkendt"
  | "i_gang"
  | "faerdig"
  | "afhentet";

export interface BookingDetails {
  selected_services: { id: string; name: string; price_dkk: number }[];
  total_price_dkk: number;
  discount_percent: number;
  includes_tempered_glass: boolean;
}

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
  booking_details: BookingDetails | null;
  customer_id: string | null;
  device_id: string | null;
  services: { id: string; name: string; price_dkk: number }[] | null;
  internal_notes: InternalNote[];
  intake_checklist: ChecklistItem[] | null;
  intake_photos: string[];
  checkout_photos: string[];
  shopify_draft_order_id: string | null;
  shopify_order_id: string | null;
  paid: boolean;
  paid_at: string | null;
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

export type CustomerType = "privat" | "erhverv";

export interface Customer {
  id: string;
  type: CustomerType;
  name: string;
  email: string | null;
  phone: string;
  company_name: string | null;
  cvr: string | null;
  created_at: string;
}

export interface CustomerDevice {
  id: string;
  customer_id: string;
  brand: string;
  model: string;
  serial_number: string | null;
  color: string | null;
  condition_notes: string | null;
  photos: string[];
  created_at: string;
}

export type ChecklistStatus = "ok" | "fejl" | "ikke_relevant";

export interface ChecklistItem {
  label: string;
  status: ChecklistStatus;
  note: string;
  photo_url: string | null;
}

export interface InternalNote {
  text: string;
  author: string;
  timestamp: string;
}

export type InquiryStatus = "ny" | "besvaret" | "lukket";

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: InquiryStatus;
  admin_notes: string | null;
  created_at: string;
}

export interface SmsLogEntry {
  id: string;
  ticket_id: string | null;
  customer_id: string | null;
  phone: string;
  message: string;
  provider_message_id: string | null;
  status: "pending" | "sent" | "failed";
  created_at: string;
}

// SEO Analytics types

export interface SeoSite {
  id: string;
  name: string;
  domain: string;
  gsc_property: string;
  gsc_credentials_env: string;
  is_active: boolean;
  created_at: string;
}

export interface SeoKeyword {
  id: string;
  site_id: string;
  date: string;
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  created_at: string;
}

export interface SeoPage {
  id: string;
  site_id: string;
  date: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  top_query: string | null;
  created_at: string;
}

export type ContentAuditType =
  | "service_page"
  | "product_page"
  | "landing_page"
  | "external";
export type IssueSeverity = "high" | "medium" | "low";

export interface AuditIssue {
  type: string;
  severity: IssueSeverity;
  message: string;
}

export interface SeoContentAudit {
  id: string;
  site_id: string;
  page_path: string;
  content_type: ContentAuditType;
  content_id: string | null;
  score: number;
  issues: AuditIssue[];
  recommendations: string[];
  last_audited: string;
  created_at: string;
}

export type SyncStatus = "success" | "error";

export interface SeoSyncLog {
  id: string;
  site_id: string;
  status: SyncStatus;
  keywords_synced: number;
  pages_synced: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
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
      customers: {
        Row: Customer;
        Insert: Omit<Customer, "id" | "created_at">;
        Update: Partial<Customer>;
      };
      customer_devices: {
        Row: CustomerDevice;
        Insert: Omit<CustomerDevice, "id" | "created_at">;
        Update: Partial<CustomerDevice>;
      };
      contact_inquiries: {
        Row: ContactInquiry;
        Insert: Omit<ContactInquiry, "id" | "created_at">;
        Update: Partial<ContactInquiry>;
      };
      sms_log: {
        Row: SmsLogEntry;
        Insert: Omit<SmsLogEntry, "id" | "created_at">;
        Update: Partial<SmsLogEntry>;
      };
    };
  };
}

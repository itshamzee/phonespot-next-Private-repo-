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
  description: string | null;
  warranty_info: string | null;
  includes: string | null;
  estimated_time_label: string | null;
  quality_tier: "standard" | "premium" | "original" | null;
  info_note: string | null;
  service_category: string | null;
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
  | "afhentet"
  | "bero"
  | "reklamation_modtaget"
  | "reklamation_vurderet"
  | "reklamation_loest";

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
  is_urgent: boolean;
  on_hold_reason: string | null;
  parent_ticket_id: string | null;
  ticket_number: string | null;
  store_location_id: string | null;
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

// --- Repair Comments ---
export type CommentVisibility = "intern" | "kunde";

export interface RepairComment {
  id: string;
  ticket_id: string;
  author: string;
  message: string;
  visibility: CommentVisibility;
  created_at: string;
}

// --- Inquiry types ---
export type InquirySource = "kontaktformular" | "saelg-enhed" | "reparation-booking" | "manuel";
export type InquiryChannel = "email" | "sms" | "form";
export type InquiryStatus = "ny" | "besvaret" | "venter_paa_svar" | "lukket";

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: InquiryStatus;
  admin_notes: string | null;
  source: InquirySource;
  assigned_to: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface InquiryMessage {
  id: string;
  inquiry_id: string;
  sender: "staff" | "customer";
  channel: InquiryChannel;
  body: string;
  staff_name: string | null;
  created_at: string;
}

// --- Reply Templates ---
export type TemplateChannel = "sms" | "email" | "quick-reply";

export interface ReplyTemplate {
  id: string;
  channel: TemplateChannel;
  name: string;
  subject: string | null;
  body: string;
  variables: string[];
  sort_order: number;
  active: boolean;
  created_at: string;
}

// --- Mail Log ---
export type MailStatus = "delivered" | "bounced" | "failed" | "pending";

export interface MailLogEntry {
  id: string;
  ticket_id: string | null;
  inquiry_id: string | null;
  to_email: string;
  subject: string;
  body: string;
  status: MailStatus;
  resend_id: string | null;
  created_at: string;
}

// --- Store Locations ---
export interface StoreLocation {
  id: string;
  slug: string;
  name: string;
  street: string;
  city: string;
  zip: string;
  phone: string;
  email: string;
  mall: string | null;
  hours_weekdays: string;
  hours_saturday: string;
  hours_sunday: string;
  google_maps_url: string;
  google_maps_embed: string;
  latitude: number;
  longitude: number;
  active: boolean;
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
      repair_comments: {
        Row: RepairComment;
        Insert: Omit<RepairComment, "id" | "created_at">;
        Update: Partial<RepairComment>;
      };
      inquiry_messages: {
        Row: InquiryMessage;
        Insert: Omit<InquiryMessage, "id" | "created_at">;
        Update: Partial<InquiryMessage>;
      };
      reply_templates: {
        Row: ReplyTemplate;
        Insert: Omit<ReplyTemplate, "id" | "created_at">;
        Update: Partial<ReplyTemplate>;
      };
      mail_log: {
        Row: MailLogEntry;
        Insert: Omit<MailLogEntry, "id" | "created_at">;
        Update: Partial<MailLogEntry>;
      };
      store_locations: {
        Row: StoreLocation;
        Insert: Omit<StoreLocation, "id" | "created_at">;
        Update: Partial<StoreLocation>;
      };
    };
  };
}

// Trade-in types
export type {
  TradeInOffer,
  TradeInOfferStatus,
  TradeInReceipt,
  TradeInReceiptStatus,
  TradeInReceiptItem,
  TradeInDerivedStatus,
} from "./trade-in-types";
export { formatDKK, deriveTradeInStatus } from "./trade-in-types";

// platform-types.ts — TypeScript types for all PhoneSpot platform tables
// All monetary values are in øre (DKK cents, integer)

// ============================================
// Enums (union types matching CHECK constraints)
// ============================================
export type DeviceGrade = 'A' | 'B' | 'C';
export type DeviceStatus = 'intake' | 'graded' | 'listed' | 'reserved' | 'sold' | 'shipped' | 'picked_up' | 'returned';
export type VatScheme = 'brugtmoms' | 'regular';
export type OrderType = 'online' | 'pos';
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'picked_up' | 'delivered' | 'cancelled' | 'refunded';
export type StaffRole = 'employee' | 'manager' | 'owner';
export type LocationType = 'store' | 'warehouse' | 'online';
export type SupplierType = 'customer_trade_in' | 'wholesale' | 'auction';
export type OrderItemType = 'device' | 'sku_product';
export type WarrantyStatus = 'active' | 'claimed' | 'expired';
export type DiscountType = 'percentage' | 'fixed' | 'free_shipping';
export type TradeInStatus = 'submitted' | 'quoted' | 'accepted' | 'received' | 'inspected' | 'paid' | 'rejected';
export type TradeInChannel = 'online' | 'pos';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
export type PaymentTerms = 'prepay' | 'net15' | 'net30';
export type ConsentType = 'cookies_statistics' | 'cookies_marketing' | 'marketing_email' | 'marketing_sms' | 'terms';
export type NotifyStatus = 'waiting' | 'notified' | 'purchased';
export type PriceEntityType = 'device' | 'sku_product';

// ============================================
// Row types (what you get back from SELECT)
// ============================================
export interface Location {
  id: string;
  name: string;
  address: string | null;
  type: LocationType;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  type: SupplierType;
  is_vat_registered: boolean;
  contact_info: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductTemplate {
  id: string;
  brand: string;
  model: string;
  category: string;
  storage_options: string[];
  colors: string[];
  default_attributes: Record<string, unknown>;
  display_name: string;
  slug: string;
  description: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  serial_number: string | null;
  imei: string | null;
  template_id: string;
  barcode: string;
  grade: DeviceGrade;
  battery_health: number | null;
  storage: string | null;
  color: string | null;
  condition_notes: string | null;
  photos: string[];
  purchase_price: number;
  selling_price: number | null;
  margin: number | null;
  vat_scheme: VatScheme;
  vat_amount: number | null;
  origin_country: string;
  supplier_id: string | null;
  location_id: string;
  status: DeviceStatus;
  purchased_at: string | null;
  listed_at: string | null;
  sold_at: string | null;
  reservation_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkuProduct {
  id: string;
  title: string;
  description: string | null;
  ean: string | null;
  product_number: string | null;
  cost_price: number | null;
  selling_price: number;
  sale_price: number | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  supplier_id: string | null;
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkuStock {
  product_id: string;
  location_id: string;
  quantity: number;
  min_level: number;
  max_level: number | null;
  updated_at: string;
}

export interface PurchaseDocument {
  id: string;
  device_id: string;
  seller_name: string;
  seller_address: string;
  document_date: string;
  item_description: string;
  purchase_price: number;
  pdf_url: string | null;
  brugtmoms_text: string;
  created_at: string;
}

export interface Customer {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  auth_id: string | null;
  addresses: Record<string, unknown>[];
  notes: string | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  type: OrderType;
  customer_id: string | null;
  location_id: string | null;
  is_b2b: boolean;
  status: OrderStatus;
  payment_method: string | null;
  stripe_payment_id: string | null;
  stripe_checkout_session_id: string | null;
  shipping_method: string | null;
  shipping_address: Record<string, unknown> | null;
  tracking_number: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  total: number;
  brugtmoms_total: number;
  discount_code_id: string | null;
  withdrawal_token: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_type: OrderItemType;
  device_id: string | null;
  sku_product_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  purchase_price: number | null;
  vat_scheme: VatScheme | null;
  created_at: string;
}

export interface Warranty {
  id: string;
  order_id: string;
  device_id: string;
  customer_id: string | null;
  guarantee_number: string;
  issued_at: string;
  expires_at: string;
  pdf_url: string | null;
  qr_verification_code: string | null;
  status: WarrantyStatus;
  created_at: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  min_order_amount: number;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
}

export interface DeviceTransfer {
  id: string;
  device_id: string;
  from_location_id: string;
  to_location_id: string;
  transferred_at: string;
  transferred_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface B2bCustomer {
  id: string;
  customer_id: string;
  company_name: string;
  cvr_nummer: string;
  payment_terms: PaymentTerms;
  approved: boolean;
  discount_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface TradeIn {
  id: string;
  customer_id: string | null;
  device_description: string;
  template_id: string | null;
  offered_price: number | null;
  status: TradeInStatus;
  submitted_at: string;
  received_at: string | null;
  paid_at: string | null;
  inspection_notes: string | null;
  final_grade: DeviceGrade | null;
  device_id: string | null;
  channel: TradeInChannel;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  order_id: string;
  b2b_customer_id: string;
  invoice_number: string;
  amount: number;
  vat_amount: number;
  total: number;
  issued_at: string;
  due_at: string;
  status: InvoiceStatus;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  role: StaffRole;
  location_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id: string | null;
  actor_type: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface PriceHistory {
  id: string;
  entity_type: PriceEntityType;
  entity_id: string;
  old_price: number | null;
  new_price: number;
  changed_by: string | null;
  changed_at: string;
}

export interface ConsentLog {
  id: string;
  customer_id: string | null;
  session_id: string | null;
  consent_type: ConsentType;
  granted: boolean;
  granted_at: string;
  withdrawn_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface TcVersion {
  id: string;
  version: string;
  content_hash: string;
  published_at: string;
  pdf_url: string | null;
}

export interface OrderTcAcceptance {
  order_id: string;
  tc_version_id: string;
  accepted_at: string;
}

export interface NotifyRequest {
  id: string;
  customer_email: string;
  template_id: string;
  grade_preference: DeviceGrade | null;
  created_at: string;
  notified_at: string | null;
  status: NotifyStatus;
}

// ============================================
// Insert types (omit auto-generated fields)
// ============================================
export type LocationInsert = Omit<Location, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type SupplierInsert = Omit<Supplier, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type ProductTemplateInsert = Omit<ProductTemplate, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type DeviceInsert = Omit<Device, 'id' | 'barcode' | 'margin' | 'vat_amount' | 'created_at' | 'updated_at'> & { id?: string };
export type SkuProductInsert = Omit<SkuProduct, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type SkuStockInsert = Omit<SkuStock, 'updated_at'>;
export type PurchaseDocumentInsert = Omit<PurchaseDocument, 'id' | 'created_at'> & { id?: string };
export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type OrderInsert = Omit<Order, 'id' | 'order_number' | 'withdrawal_token' | 'created_at' | 'updated_at'> & { id?: string };
export type OrderItemInsert = Omit<OrderItem, 'id' | 'created_at'> & { id?: string };
export type WarrantyInsert = Omit<Warranty, 'id' | 'guarantee_number' | 'created_at'> & { id?: string };
export type DiscountCodeInsert = Omit<DiscountCode, 'id' | 'created_at'> & { id?: string };
export type DeviceTransferInsert = Omit<DeviceTransfer, 'id' | 'created_at'> & { id?: string };
export type B2bCustomerInsert = Omit<B2bCustomer, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type TradeInInsert = Omit<TradeIn, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type InvoiceInsert = Omit<Invoice, 'id' | 'invoice_number' | 'created_at' | 'updated_at'> & { id?: string };
export type StaffInsert = Omit<Staff, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type ActivityLogInsert = Omit<ActivityLog, 'id' | 'created_at'> & { id?: string };
export type ConsentLogInsert = Omit<ConsentLog, 'id'> & { id?: string };
export type TcVersionInsert = Omit<TcVersion, 'id'> & { id?: string };
export type OrderTcAcceptanceInsert = OrderTcAcceptance;
export type NotifyRequestInsert = Omit<NotifyRequest, 'id' | 'created_at'> & { id?: string };

// ============================================
// Update types (all optional except id)
// ============================================
export type LocationUpdate = Partial<Omit<Location, 'id' | 'created_at'>> & { id: string };
export type DeviceUpdate = Partial<Omit<Device, 'id' | 'barcode' | 'margin' | 'vat_amount' | 'created_at'>> & { id: string };
export type SkuProductUpdate = Partial<Omit<SkuProduct, 'id' | 'created_at'>> & { id: string };
export type OrderUpdate = Partial<Omit<Order, 'id' | 'order_number' | 'created_at'>> & { id: string };
export type CustomerUpdate = Partial<Omit<Customer, 'id' | 'created_at'>> & { id: string };
export type StaffUpdate = Partial<Omit<Staff, 'id' | 'created_at'>> & { id: string };
export type TradeInUpdate = Partial<Omit<TradeIn, 'id' | 'created_at'>> & { id: string };
export type InvoiceUpdate = Partial<Omit<Invoice, 'id' | 'created_at'>> & { id: string };
export type WarrantyUpdate = Partial<Omit<Warranty, 'id' | 'created_at'>> & { id: string };

-- 20260312_003_operations_schema.sql
-- Operations tables: transfers, trade-ins, B2B, invoices

-- ============================================
-- DEVICE_TRANSFERS — movement between locations
-- ============================================
CREATE TABLE IF NOT EXISTS device_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  from_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  to_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transferred_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_device_transfers_device ON device_transfers(device_id);

-- ============================================
-- B2B_CUSTOMERS — business accounts
-- ============================================
CREATE TABLE IF NOT EXISTS b2b_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  cvr_nummer TEXT NOT NULL,
  payment_terms TEXT NOT NULL DEFAULT 'prepay' CHECK (payment_terms IN ('prepay', 'net15', 'net30')),
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_b2b_cvr ON b2b_customers(cvr_nummer);

-- ============================================
-- TRADE_INS — devices submitted for trade-in
-- ============================================
CREATE TABLE IF NOT EXISTS trade_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  device_description TEXT NOT NULL,
  template_id UUID REFERENCES product_templates(id) ON DELETE SET NULL,
  offered_price INTEGER,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'quoted', 'accepted', 'received', 'inspected', 'paid', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  inspection_notes TEXT,
  final_grade TEXT CHECK (final_grade IN ('A', 'B', 'C')),
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'online' CHECK (channel IN ('online', 'pos')),
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'store_credit', 'cash')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trade_ins_customer ON trade_ins(customer_id);
CREATE INDEX idx_trade_ins_status ON trade_ins(status);

-- ============================================
-- INVOICES — B2B net-term invoices
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  b2b_customer_id UUID NOT NULL REFERENCES b2b_customers(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  vat_amount INTEGER NOT NULL,
  total INTEGER NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_order ON invoices(order_id);
CREATE INDEX idx_invoices_b2b ON invoices(b2b_customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);

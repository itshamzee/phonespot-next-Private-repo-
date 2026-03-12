-- 20260312_002_commerce_schema.sql
-- Commerce tables for orders, customers, warranties

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  phone TEXT,
  name TEXT NOT NULL,
  auth_id UUID UNIQUE,
  addresses JSONB DEFAULT '[]',
  notes TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_auth ON customers(auth_id);

-- ============================================
-- ORDERS — unified online + POS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('online', 'pos')),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  is_b2b BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'picked_up', 'delivered', 'cancelled', 'refunded')),
  payment_method TEXT,
  stripe_payment_id TEXT,
  stripe_checkout_session_id TEXT,
  shipping_method TEXT,
  shipping_address JSONB,
  tracking_number TEXT,
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  shipping_cost INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  brugtmoms_total INTEGER NOT NULL DEFAULT 0,
  discount_code_id UUID,
  withdrawal_token TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_type ON orders(type);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_withdrawal_token ON orders(withdrawal_token);

-- ============================================
-- ORDER_ITEMS — line items
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('device', 'sku_product')),
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  sku_product_id UUID REFERENCES sku_products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  purchase_price INTEGER,
  vat_scheme TEXT CHECK (vat_scheme IN ('brugtmoms', 'regular')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_item_ref CHECK (
    (item_type = 'device' AND device_id IS NOT NULL AND sku_product_id IS NULL) OR
    (item_type = 'sku_product' AND sku_product_id IS NOT NULL AND device_id IS NULL)
  )
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_device ON order_items(device_id);
CREATE INDEX idx_order_items_sku ON order_items(sku_product_id);

-- ============================================
-- WARRANTIES — garantibeviser
-- ============================================
CREATE TABLE IF NOT EXISTS warranties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  guarantee_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  pdf_url TEXT,
  qr_verification_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_warranties_order ON warranties(order_id);
CREATE INDEX idx_warranties_device ON warranties(device_id);
CREATE INDEX idx_warranties_customer ON warranties(customer_id);
CREATE INDEX idx_warranties_guarantee_number ON warranties(guarantee_number);
CREATE INDEX idx_warranties_qr ON warranties(qr_verification_code);

-- ============================================
-- DISCOUNT_CODES
-- ============================================
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed', 'free_shipping')),
  value INTEGER NOT NULL,
  min_order_amount INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  usage_limit INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ADD CONSTRAINT fk_orders_discount_code
  FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE SET NULL;

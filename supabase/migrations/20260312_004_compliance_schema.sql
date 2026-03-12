-- 20260312_004_compliance_schema.sql
-- Legal compliance + staff tables

-- ============================================
-- STAFF — employees with roles
-- ============================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'owner')),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ACTIVITY_LOG — immutable audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID,
  actor_type TEXT CHECK (actor_type IN ('staff', 'customer', 'system')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_actor ON activity_log(actor_id);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- ============================================
-- PRICE_HISTORY — 30-day Omnibus compliance
-- ============================================
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('device', 'sku_product')),
  entity_id UUID NOT NULL,
  old_price INTEGER,
  new_price INTEGER NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID
);

CREATE INDEX idx_price_history_entity ON price_history(entity_type, entity_id);
CREATE INDEX idx_price_history_changed ON price_history(changed_at DESC);

-- ============================================
-- CONSENT_LOG — GDPR consent tracking
-- ============================================
CREATE TABLE IF NOT EXISTS consent_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  session_id TEXT,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('cookies_statistics', 'cookies_marketing', 'marketing_email', 'marketing_sms', 'terms')),
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_consent_log_customer ON consent_log(customer_id);

-- ============================================
-- TC_VERSIONS — terms & conditions versioning
-- ============================================
CREATE TABLE IF NOT EXISTS tc_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT NOT NULL UNIQUE,
  content_hash TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pdf_url TEXT
);

-- ============================================
-- ORDER_TC_ACCEPTANCE — which T&C version accepted per order
-- ============================================
CREATE TABLE IF NOT EXISTS order_tc_acceptance (
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tc_version_id UUID NOT NULL REFERENCES tc_versions(id) ON DELETE RESTRICT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (order_id)
);

-- ============================================
-- NOTIFY_REQUESTS — "notify me" sign-ups
-- ============================================
CREATE TABLE IF NOT EXISTS notify_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_email TEXT NOT NULL,
  template_id UUID NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
  grade_preference TEXT CHECK (grade_preference IN ('A', 'B', 'C')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'purchased')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ
);

CREATE INDEX idx_notify_requests_template ON notify_requests(template_id);
CREATE INDEX idx_notify_requests_email ON notify_requests(customer_email);

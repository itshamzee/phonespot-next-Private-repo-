-- 20260312_005_staff_auth.sql
-- Row Level Security policies for staff-based access control
-- Roles: employee (POS + intake), manager (+ stock, transfers, reports for their location), owner (everything)

-- Helper function: get current staff record from auth.uid()
CREATE OR REPLACE FUNCTION get_staff_role()
RETURNS TEXT AS $$
  SELECT role FROM staff WHERE auth_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_staff_id()
RETURNS UUID AS $$
  SELECT id FROM staff WHERE auth_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_staff_location()
RETURNS UUID AS $$
  SELECT location_id FROM staff WHERE auth_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM staff WHERE auth_id = auth.uid() AND role = 'owner' AND is_active = TRUE);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_manager_or_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM staff WHERE auth_id = auth.uid() AND role IN ('manager', 'owner') AND is_active = TRUE);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM staff WHERE auth_id = auth.uid() AND is_active = TRUE);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tc_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tc_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notify_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ policies (for webshop)
CREATE POLICY locations_public_read ON locations FOR SELECT USING (TRUE);
CREATE POLICY templates_public_read ON product_templates FOR SELECT USING (TRUE);
CREATE POLICY devices_public_read ON devices FOR SELECT USING (status = 'listed');
CREATE POLICY sku_products_public_read ON sku_products FOR SELECT USING (is_active = TRUE);
CREATE POLICY sku_stock_public_read ON sku_stock FOR SELECT USING (TRUE);
CREATE POLICY tc_public_read ON tc_versions FOR SELECT USING (TRUE);
CREATE POLICY discount_codes_public_read ON discount_codes FOR SELECT USING (is_active = TRUE);

-- PUBLIC WRITE policies (for customers)
CREATE POLICY notify_requests_public_insert ON notify_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY consent_log_public_insert ON consent_log FOR INSERT WITH CHECK (TRUE);

-- STAFF policies — all staff can read everything
CREATE POLICY staff_read_devices ON devices FOR SELECT USING (is_staff());
CREATE POLICY staff_read_customers ON customers FOR SELECT USING (is_staff());
CREATE POLICY staff_read_orders ON orders FOR SELECT USING (is_staff());
CREATE POLICY staff_read_order_items ON order_items FOR SELECT USING (is_staff());
CREATE POLICY staff_read_warranties ON warranties FOR SELECT USING (is_staff());
CREATE POLICY staff_read_suppliers ON suppliers FOR SELECT USING (is_staff());
CREATE POLICY staff_read_purchase_docs ON purchase_documents FOR SELECT USING (is_staff());
CREATE POLICY staff_read_transfers ON device_transfers FOR SELECT USING (is_staff());
CREATE POLICY staff_read_trade_ins ON trade_ins FOR SELECT USING (is_staff());
CREATE POLICY staff_read_b2b ON b2b_customers FOR SELECT USING (is_staff());
CREATE POLICY staff_read_invoices ON invoices FOR SELECT USING (is_staff());
CREATE POLICY staff_read_activity ON activity_log FOR SELECT USING (is_staff());
CREATE POLICY staff_read_price_history ON price_history FOR SELECT USING (is_staff());
CREATE POLICY staff_read_consent ON consent_log FOR SELECT USING (is_staff());
CREATE POLICY staff_read_notify ON notify_requests FOR SELECT USING (is_staff());
CREATE POLICY staff_read_staff ON staff FOR SELECT USING (is_staff());
CREATE POLICY staff_read_discount ON discount_codes FOR SELECT USING (is_staff());
CREATE POLICY staff_read_order_tc ON order_tc_acceptance FOR SELECT USING (is_staff());

-- EMPLOYEE write policies (POS + intake)
CREATE POLICY staff_insert_devices ON devices FOR INSERT WITH CHECK (is_staff());
CREATE POLICY staff_update_devices ON devices FOR UPDATE USING (is_staff());
CREATE POLICY staff_insert_purchase_docs ON purchase_documents FOR INSERT WITH CHECK (is_staff());
CREATE POLICY staff_insert_orders ON orders FOR INSERT WITH CHECK (is_staff());
CREATE POLICY staff_insert_order_items ON order_items FOR INSERT WITH CHECK (is_staff());
CREATE POLICY staff_insert_customers ON customers FOR INSERT WITH CHECK (is_staff());
CREATE POLICY staff_update_customers ON customers FOR UPDATE USING (is_staff());
CREATE POLICY staff_insert_warranties ON warranties FOR INSERT WITH CHECK (is_staff());
CREATE POLICY staff_insert_activity ON activity_log FOR INSERT WITH CHECK (is_staff());
CREATE POLICY staff_insert_trade_ins ON trade_ins FOR INSERT WITH CHECK (is_staff());
CREATE POLICY staff_update_trade_ins ON trade_ins FOR UPDATE USING (is_staff());

-- MANAGER+ write policies (location-scoped where applicable)
CREATE POLICY manager_insert_transfers ON device_transfers FOR INSERT
  WITH CHECK (is_manager_or_owner() AND (is_owner() OR from_location_id = get_staff_location()));
CREATE POLICY manager_insert_suppliers ON suppliers FOR INSERT WITH CHECK (is_manager_or_owner());
CREATE POLICY manager_update_suppliers ON suppliers FOR UPDATE USING (is_manager_or_owner());
CREATE POLICY manager_insert_templates ON product_templates FOR INSERT WITH CHECK (is_manager_or_owner());
CREATE POLICY manager_update_templates ON product_templates FOR UPDATE USING (is_manager_or_owner());
CREATE POLICY manager_insert_sku ON sku_products FOR INSERT WITH CHECK (is_manager_or_owner());
CREATE POLICY manager_update_sku ON sku_products FOR UPDATE USING (is_manager_or_owner());
CREATE POLICY manager_insert_sku_stock ON sku_stock FOR INSERT
  WITH CHECK (is_manager_or_owner() AND (is_owner() OR location_id = get_staff_location()));
CREATE POLICY manager_update_sku_stock ON sku_stock FOR UPDATE
  USING (is_manager_or_owner() AND (is_owner() OR location_id = get_staff_location()));
CREATE POLICY manager_insert_price_history ON price_history FOR INSERT WITH CHECK (is_manager_or_owner());
CREATE POLICY manager_update_orders ON orders FOR UPDATE
  USING (is_manager_or_owner() AND (is_owner() OR location_id = get_staff_location()));

-- OWNER-only policies
CREATE POLICY owner_insert_staff ON staff FOR INSERT WITH CHECK (is_owner());
CREATE POLICY owner_update_staff ON staff FOR UPDATE USING (is_owner());
CREATE POLICY owner_delete_staff ON staff FOR DELETE USING (is_owner());
CREATE POLICY owner_insert_locations ON locations FOR INSERT WITH CHECK (is_owner());
CREATE POLICY owner_update_locations ON locations FOR UPDATE USING (is_owner());
CREATE POLICY owner_insert_discount ON discount_codes FOR INSERT WITH CHECK (is_owner());
CREATE POLICY owner_update_discount ON discount_codes FOR UPDATE USING (is_owner());
CREATE POLICY owner_insert_b2b ON b2b_customers FOR INSERT WITH CHECK (is_owner());
CREATE POLICY owner_update_b2b ON b2b_customers FOR UPDATE USING (is_owner());
CREATE POLICY owner_insert_invoices ON invoices FOR INSERT WITH CHECK (is_owner());
CREATE POLICY owner_update_invoices ON invoices FOR UPDATE USING (is_owner());
CREATE POLICY owner_insert_tc ON tc_versions FOR INSERT WITH CHECK (is_owner());

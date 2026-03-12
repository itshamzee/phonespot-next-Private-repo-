-- 20260312_007_computed_fields.sql
-- Auto-generated order numbers, guarantee numbers, updated_at triggers

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'PSP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

CREATE SEQUENCE IF NOT EXISTS guarantee_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_guarantee_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.guarantee_number IS NULL OR NEW.guarantee_number = '' THEN
    NEW.guarantee_number := 'PSP-GAR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('guarantee_number_seq')::TEXT, 5, '0');
  END IF;
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.issued_at + INTERVAL '36 months';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guarantee_number
  BEFORE INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION generate_guarantee_number();

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'PSP-INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

CREATE SEQUENCE IF NOT EXISTS device_barcode_seq START 1;

CREATE OR REPLACE FUNCTION generate_device_barcode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.barcode IS NULL OR NEW.barcode = '' THEN
    NEW.barcode := 'PSP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('device_barcode_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_device_barcode
  BEFORE INSERT ON devices
  FOR EACH ROW
  EXECUTE FUNCTION generate_device_barcode();

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION generate_withdrawal_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'online' AND NEW.withdrawal_token IS NULL THEN
    NEW.withdrawal_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_withdrawal_token
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_withdrawal_token();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_updated_at_locations BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_suppliers BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_templates BEFORE UPDATE ON product_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_devices BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_sku_products BEFORE UPDATE ON sku_products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_customers BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_orders BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_b2b BEFORE UPDATE ON b2b_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_trade_ins BEFORE UPDATE ON trade_ins FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_invoices BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_staff BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION track_device_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.selling_price IS DISTINCT FROM NEW.selling_price THEN
    INSERT INTO price_history (entity_type, entity_id, old_price, new_price, changed_by)
    VALUES ('device', NEW.id, OLD.selling_price, NEW.selling_price, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_device_price_history
  AFTER UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION track_device_price_change();

CREATE OR REPLACE FUNCTION track_sku_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.selling_price IS DISTINCT FROM NEW.selling_price OR
     OLD.sale_price IS DISTINCT FROM NEW.sale_price THEN
    INSERT INTO price_history (entity_type, entity_id, old_price, new_price, changed_by)
    VALUES ('sku_product', NEW.id,
      COALESCE(OLD.sale_price, OLD.selling_price),
      COALESCE(NEW.sale_price, NEW.selling_price),
      auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sku_price_history
  AFTER UPDATE ON sku_products
  FOR EACH ROW
  EXECUTE FUNCTION track_sku_price_change();

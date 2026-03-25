-- Foxway dropship integration: grades N/P, source tracking, import log
-- =================================================================

-- 1. Extend grade CHECK to include N (Fabriksny) and P (Premium)
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_grade_check;
ALTER TABLE devices ADD CONSTRAINT devices_grade_check CHECK (grade IN ('N', 'P', 'A', 'B', 'C'));

ALTER TABLE grading_records DROP CONSTRAINT IF EXISTS grading_records_final_grade_check;
ALTER TABLE grading_records ADD CONSTRAINT grading_records_final_grade_check CHECK (final_grade IN ('N', 'P', 'A', 'B', 'C'));

-- 2. Add 'delisted' to device status
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_status_check;
ALTER TABLE devices ADD CONSTRAINT devices_status_check
  CHECK (status IN ('intake', 'graded', 'listed', 'reserved', 'sold', 'shipped', 'picked_up', 'returned', 'delisted'));

-- 3. Add source tracking columns to devices
ALTER TABLE devices ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS source_sku TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS source_stock INTEGER DEFAULT 0;

-- 4. Add base_price_n and base_price_p to product_templates
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_n INTEGER;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_p INTEGER;

-- 5. Create Foxway supplier
INSERT INTO suppliers (name, type, is_vat_registered, contact_info)
VALUES ('Foxway', 'wholesale', true, '{"email": "orders@foxway.dk", "url": "https://foxway.dk"}')
ON CONFLICT DO NOTHING;

-- 6. Import log table
CREATE TABLE IF NOT EXISTS foxway_import_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  filename TEXT,
  total_rows INTEGER,
  imported_rows INTEGER,
  skipped_rows INTEGER,
  errors JSONB,
  imported_by UUID
);

-- 7. Index for Foxway source lookups
CREATE INDEX IF NOT EXISTS idx_devices_source ON devices (source) WHERE source != 'internal';
CREATE INDEX IF NOT EXISTS idx_devices_source_sku ON devices (source_sku) WHERE source_sku IS NOT NULL;

-- 8. Atomic stock decrement function for Foxway checkout
CREATE OR REPLACE FUNCTION decrement_foxway_stock(p_device_id UUID)
RETURNS INTEGER AS $$
DECLARE affected INTEGER;
BEGIN
  UPDATE devices SET source_stock = source_stock - 1
  WHERE id = p_device_id AND source = 'foxway' AND source_stock > 0;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;
  UPDATE devices SET status = 'delisted'
  WHERE id = p_device_id AND source_stock <= 0;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;

-- 20260817_laptop_upgrades.sql
-- Central prisliste for RAM/SSD-opgraderinger + kobling pr. laptop-skabelon.
CREATE TABLE IF NOT EXISTS laptop_upgrade_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL CHECK (kind IN ('ram', 'ssd')),
  label TEXT NOT NULL,
  target_spec TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_upgrade_options (
  template_id UUID NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
  upgrade_option_id UUID NOT NULL REFERENCES laptop_upgrade_options(id) ON DELETE CASCADE,
  PRIMARY KEY (template_id, upgrade_option_id)
);

-- Snapshot af valgte opgraderinger paa laptop-ordrelinjen:
-- [{"option_id": "...", "kind": "ram", "label": "...", "price_oere": 59900}]
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS upgrade_details JSONB;

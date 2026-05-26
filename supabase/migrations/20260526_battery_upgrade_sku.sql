-- Insert a stable sku_products row representing the "Nyt 100% batteri" upgrade service.
-- Referenced by the AddToCartButton's battery upgrade line item so order_items FK is satisfied.
-- The price (30000 øre = 300 kr) is enforced in validate.ts to prevent client tampering.
--
-- Column mapping vs spec proposal:
--   spec: category_slug  → actual column: category
--   spec: is_always_in_stock → actual column: always_in_stock
--   spec: image_url      → actual column: images TEXT[] (array)
--
-- Run AFTER 20260526_battery_upgrade_flag.sql.

INSERT INTO sku_products (
  id,
  title,
  description,
  selling_price,
  category,
  subcategory,
  is_active,
  always_in_stock,
  images,
  attributes
)
VALUES (
  '00000000-0000-4000-8000-000000000bb1', -- deterministic UUID (not random) so we can reference it from code
  'Nyt 100% batteri — installation',
  'Vores tekniker installerer et nyt originalt 100% batteri i din iPhone inden forsendelse. Tilvalg ved køb af refurbished iPhone.',
  30000,
  'tilbehoer',
  'service',
  TRUE,
  TRUE,
  ARRAY['/images/battery-upgrade.png'],
  '{"service_type": "battery_replacement"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

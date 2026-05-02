-- Add featured-product fields to product_templates
ALTER TABLE product_templates
  ADD COLUMN featured_priority integer,
  ADD COLUMN featured_starts_at timestamptz,
  ADD COLUMN featured_ends_at timestamptz;

CREATE INDEX idx_product_templates_featured
  ON product_templates (featured_priority, featured_starts_at, featured_ends_at)
  WHERE featured_priority IS NOT NULL;

COMMENT ON COLUMN product_templates.featured_priority IS
  'Lowest non-null integer wins (1 = topmost). NULL means not featured.';

COMMENT ON COLUMN product_templates.featured_starts_at IS
  'Featured product becomes active at this timestamp. NULL = no lower bound.';

COMMENT ON COLUMN product_templates.featured_ends_at IS
  'Featured product expires at this timestamp. NULL = no upper bound.';

CREATE TABLE store_status (
  slug text PRIMARY KEY,
  current_wait_minutes integer,
  current_technician_count integer,
  data_updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO store_status (slug, current_wait_minutes, current_technician_count)
VALUES
  ('vejle', NULL, NULL),
  ('slagelse', NULL, NULL);

COMMENT ON TABLE store_status IS
  'Live store data updated by staff. data_updated_at drives staleness check (4-hour threshold).';

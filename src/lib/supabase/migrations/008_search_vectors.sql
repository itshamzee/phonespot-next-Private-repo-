-- 008_search_vectors.sql
-- Full-text search vectors with Danish stemming for product_templates and sku_products

-- product_templates search vector
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_product_templates_search
  ON product_templates USING GIN (search_vector);

CREATE OR REPLACE FUNCTION update_product_template_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('danish', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('danish', coalesce(NEW.brand, '')), 'A') ||
    setweight(to_tsvector('danish', coalesce(NEW.model, '')), 'B') ||
    setweight(to_tsvector('danish', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('danish', coalesce(NEW.short_description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_templates_search ON product_templates;
CREATE TRIGGER trg_product_templates_search
  BEFORE INSERT OR UPDATE ON product_templates
  FOR EACH ROW EXECUTE FUNCTION update_product_template_search_vector();

-- Backfill existing rows
UPDATE product_templates SET search_vector =
  setweight(to_tsvector('danish', coalesce(display_name, '')), 'A') ||
  setweight(to_tsvector('danish', coalesce(brand, '')), 'A') ||
  setweight(to_tsvector('danish', coalesce(model, '')), 'B') ||
  setweight(to_tsvector('danish', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('danish', coalesce(short_description, '')), 'C');

-- sku_products search vector
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_sku_products_search
  ON sku_products USING GIN (search_vector);

CREATE OR REPLACE FUNCTION update_sku_product_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('danish', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('danish', coalesce(NEW.brand, '')), 'B') ||
    setweight(to_tsvector('danish', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('danish', coalesce(NEW.short_description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sku_products_search ON sku_products;
CREATE TRIGGER trg_sku_products_search
  BEFORE INSERT OR UPDATE ON sku_products
  FOR EACH ROW EXECUTE FUNCTION update_sku_product_search_vector();

-- Backfill existing rows
UPDATE sku_products SET search_vector =
  setweight(to_tsvector('danish', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('danish', coalesce(brand, '')), 'B') ||
  setweight(to_tsvector('danish', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('danish', coalesce(short_description, '')), 'C');

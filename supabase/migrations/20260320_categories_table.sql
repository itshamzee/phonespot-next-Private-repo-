-- Categories table: hierarchical, manageable from admin
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('device', 'accessory', 'spare-part')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed: Device parent
INSERT INTO categories (name, slug, parent_id, product_type, sort_order) VALUES
  ('Enheder', 'enheder', NULL, 'device', 0);

-- Seed: Device children
INSERT INTO categories (name, slug, parent_id, product_type, sort_order) VALUES
  ('iPhones', 'iphones', (SELECT id FROM categories WHERE slug = 'enheder'), 'device', 1),
  ('Smartphones', 'smartphones', (SELECT id FROM categories WHERE slug = 'enheder'), 'device', 2),
  ('iPads', 'ipads', (SELECT id FROM categories WHERE slug = 'enheder'), 'device', 3),
  ('Tablets', 'tablets', (SELECT id FROM categories WHERE slug = 'enheder'), 'device', 4),
  ('Ure', 'ure', (SELECT id FROM categories WHERE slug = 'enheder'), 'device', 5),
  ('Baerbare', 'baerbare', (SELECT id FROM categories WHERE slug = 'enheder'), 'device', 6);

-- Seed: Accessory parent
INSERT INTO categories (name, slug, parent_id, product_type, sort_order) VALUES
  ('Tilbehoer', 'tilbehoer', NULL, 'accessory', 10);

-- Seed: Accessory children
INSERT INTO categories (name, slug, parent_id, product_type, sort_order) VALUES
  ('Covers & Cases', 'covers', (SELECT id FROM categories WHERE slug = 'tilbehoer'), 'accessory', 11),
  ('Skaermbeskyttelse', 'skaermbeskyttelse', (SELECT id FROM categories WHERE slug = 'tilbehoer'), 'accessory', 12),
  ('Opladere', 'opladere', (SELECT id FROM categories WHERE slug = 'tilbehoer'), 'accessory', 13),
  ('Kabler', 'kabler', (SELECT id FROM categories WHERE slug = 'tilbehoer'), 'accessory', 14),
  ('Lyd', 'lyd', (SELECT id FROM categories WHERE slug = 'tilbehoer'), 'accessory', 15),
  ('Holdere', 'holdere', (SELECT id FROM categories WHERE slug = 'tilbehoer'), 'accessory', 16);

-- Seed: Spare parts parent
INSERT INTO categories (name, slug, parent_id, product_type, sort_order) VALUES
  ('Reservedele', 'reservedele', NULL, 'spare-part', 20);

-- Seed: Spare parts children
INSERT INTO categories (name, slug, parent_id, product_type, sort_order) VALUES
  ('Skaerme', 'skaerme', (SELECT id FROM categories WHERE slug = 'reservedele'), 'spare-part', 21),
  ('Batterier', 'batterier', (SELECT id FROM categories WHERE slug = 'reservedele'), 'spare-part', 22);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_product_type ON categories(product_type);

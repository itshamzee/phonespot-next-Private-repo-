-- Seed common device templates so they are available when linking compatible
-- devices to accessory products. Uses ON CONFLICT DO NOTHING so running this
-- migration multiple times is safe.

-- ============================================================
-- Apple — iPhones
-- ============================================================
INSERT INTO product_templates (brand, model, display_name, category, slug, storage_options, colors) VALUES
  ('Apple', 'iPhone SE (2020)',      'Apple iPhone SE (2020)',      'iphone', 'apple-iphone-se-2020',      '{}', '{}'),
  ('Apple', 'iPhone SE (2022)',      'Apple iPhone SE (2022)',      'iphone', 'apple-iphone-se-2022',      '{}', '{}'),
  ('Apple', 'iPhone 11',             'Apple iPhone 11',             'iphone', 'apple-iphone-11',           '{}', '{}'),
  ('Apple', 'iPhone 11 Pro',         'Apple iPhone 11 Pro',         'iphone', 'apple-iphone-11-pro',       '{}', '{}'),
  ('Apple', 'iPhone 11 Pro Max',     'Apple iPhone 11 Pro Max',     'iphone', 'apple-iphone-11-pro-max',   '{}', '{}'),
  ('Apple', 'iPhone 12 mini',        'Apple iPhone 12 mini',        'iphone', 'apple-iphone-12-mini',      '{}', '{}'),
  ('Apple', 'iPhone 12',             'Apple iPhone 12',             'iphone', 'apple-iphone-12',           '{}', '{}'),
  ('Apple', 'iPhone 12 Pro',         'Apple iPhone 12 Pro',         'iphone', 'apple-iphone-12-pro',       '{}', '{}'),
  ('Apple', 'iPhone 12 Pro Max',     'Apple iPhone 12 Pro Max',     'iphone', 'apple-iphone-12-pro-max',   '{}', '{}'),
  ('Apple', 'iPhone 13 mini',        'Apple iPhone 13 mini',        'iphone', 'apple-iphone-13-mini',      '{}', '{}'),
  ('Apple', 'iPhone 13',             'Apple iPhone 13',             'iphone', 'apple-iphone-13',           '{}', '{}'),
  ('Apple', 'iPhone 13 Pro',         'Apple iPhone 13 Pro',         'iphone', 'apple-iphone-13-pro',       '{}', '{}'),
  ('Apple', 'iPhone 13 Pro Max',     'Apple iPhone 13 Pro Max',     'iphone', 'apple-iphone-13-pro-max',   '{}', '{}'),
  ('Apple', 'iPhone 14',             'Apple iPhone 14',             'iphone', 'apple-iphone-14',           '{}', '{}'),
  ('Apple', 'iPhone 14 Plus',        'Apple iPhone 14 Plus',        'iphone', 'apple-iphone-14-plus',      '{}', '{}'),
  ('Apple', 'iPhone 14 Pro',         'Apple iPhone 14 Pro',         'iphone', 'apple-iphone-14-pro',       '{}', '{}'),
  ('Apple', 'iPhone 14 Pro Max',     'Apple iPhone 14 Pro Max',     'iphone', 'apple-iphone-14-pro-max',   '{}', '{}'),
  ('Apple', 'iPhone 15',             'Apple iPhone 15',             'iphone', 'apple-iphone-15',           '{}', '{}'),
  ('Apple', 'iPhone 15 Plus',        'Apple iPhone 15 Plus',        'iphone', 'apple-iphone-15-plus',      '{}', '{}'),
  ('Apple', 'iPhone 15 Pro',         'Apple iPhone 15 Pro',         'iphone', 'apple-iphone-15-pro',       '{}', '{}'),
  ('Apple', 'iPhone 15 Pro Max',     'Apple iPhone 15 Pro Max',     'iphone', 'apple-iphone-15-pro-max',   '{}', '{}'),
  ('Apple', 'iPhone 16',             'Apple iPhone 16',             'iphone', 'apple-iphone-16',           '{}', '{}'),
  ('Apple', 'iPhone 16 Plus',        'Apple iPhone 16 Plus',        'iphone', 'apple-iphone-16-plus',      '{}', '{}'),
  ('Apple', 'iPhone 16 Pro',         'Apple iPhone 16 Pro',         'iphone', 'apple-iphone-16-pro',       '{}', '{}'),
  ('Apple', 'iPhone 16 Pro Max',     'Apple iPhone 16 Pro Max',     'iphone', 'apple-iphone-16-pro-max',   '{}', '{}'),
  ('Apple', 'iPhone 16e',            'Apple iPhone 16e',            'iphone', 'apple-iphone-16e',          '{}', '{}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Apple — iPads
-- ============================================================
INSERT INTO product_templates (brand, model, display_name, category, slug, storage_options, colors) VALUES
  ('Apple', 'iPad 9.7 (2018)',       'Apple iPad 9.7 (2018)',       'ipad', 'apple-ipad-9-7-2018',         '{}', '{}'),
  ('Apple', 'iPad 10.2 (2019)',      'Apple iPad 10.2 (2019)',      'ipad', 'apple-ipad-10-2-2019',        '{}', '{}'),
  ('Apple', 'iPad 10.2 (2020)',      'Apple iPad 10.2 (2020)',      'ipad', 'apple-ipad-10-2-2020',        '{}', '{}'),
  ('Apple', 'iPad 10.2 (2021)',      'Apple iPad 10.2 (2021)',      'ipad', 'apple-ipad-10-2-2021',        '{}', '{}'),
  ('Apple', 'iPad 10.9 (2022)',      'Apple iPad 10.9 (2022)',      'ipad', 'apple-ipad-10-9-2022',        '{}', '{}'),
  ('Apple', 'iPad Air 4',            'Apple iPad Air 4',            'ipad', 'apple-ipad-air-4',            '{}', '{}'),
  ('Apple', 'iPad Air 5',            'Apple iPad Air 5',            'ipad', 'apple-ipad-air-5',            '{}', '{}'),
  ('Apple', 'iPad Air 11 M2',        'Apple iPad Air 11 M2',        'ipad', 'apple-ipad-air-11-m2',        '{}', '{}'),
  ('Apple', 'iPad Air 13 M2',        'Apple iPad Air 13 M2',        'ipad', 'apple-ipad-air-13-m2',        '{}', '{}'),
  ('Apple', 'iPad mini 5',           'Apple iPad mini 5',           'ipad', 'apple-ipad-mini-5',           '{}', '{}'),
  ('Apple', 'iPad mini 6',           'Apple iPad mini 6',           'ipad', 'apple-ipad-mini-6',           '{}', '{}'),
  ('Apple', 'iPad Pro 11 (2018)',    'Apple iPad Pro 11 (2018)',    'ipad', 'apple-ipad-pro-11-2018',      '{}', '{}'),
  ('Apple', 'iPad Pro 11 (2020)',    'Apple iPad Pro 11 (2020)',    'ipad', 'apple-ipad-pro-11-2020',      '{}', '{}'),
  ('Apple', 'iPad Pro 11 (2021)',    'Apple iPad Pro 11 (2021)',    'ipad', 'apple-ipad-pro-11-2021',      '{}', '{}'),
  ('Apple', 'iPad Pro 11 (2022)',    'Apple iPad Pro 11 (2022)',    'ipad', 'apple-ipad-pro-11-2022',      '{}', '{}'),
  ('Apple', 'iPad Pro 11 M4',        'Apple iPad Pro 11 M4',        'ipad', 'apple-ipad-pro-11-m4',        '{}', '{}'),
  ('Apple', 'iPad Pro 12.9 (2018)', 'Apple iPad Pro 12.9 (2018)', 'ipad', 'apple-ipad-pro-12-9-2018',   '{}', '{}'),
  ('Apple', 'iPad Pro 12.9 (2020)', 'Apple iPad Pro 12.9 (2020)', 'ipad', 'apple-ipad-pro-12-9-2020',   '{}', '{}'),
  ('Apple', 'iPad Pro 12.9 (2021)', 'Apple iPad Pro 12.9 (2021)', 'ipad', 'apple-ipad-pro-12-9-2021',   '{}', '{}'),
  ('Apple', 'iPad Pro 12.9 (2022)', 'Apple iPad Pro 12.9 (2022)', 'ipad', 'apple-ipad-pro-12-9-2022',   '{}', '{}'),
  ('Apple', 'iPad Pro 13 M4',        'Apple iPad Pro 13 M4',        'ipad', 'apple-ipad-pro-13-m4',        '{}', '{}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Apple — Watch
-- ============================================================
INSERT INTO product_templates (brand, model, display_name, category, slug, storage_options, colors) VALUES
  ('Apple', 'Apple Watch SE (2022)',   'Apple Watch SE (2022)',   'smartwatch', 'apple-watch-se-2022',   '{}', '{}'),
  ('Apple', 'Apple Watch SE (2024)',   'Apple Watch SE (2024)',   'smartwatch', 'apple-watch-se-2024',   '{}', '{}'),
  ('Apple', 'Apple Watch Series 7',   'Apple Watch Series 7',   'smartwatch', 'apple-watch-series-7',  '{}', '{}'),
  ('Apple', 'Apple Watch Series 8',   'Apple Watch Series 8',   'smartwatch', 'apple-watch-series-8',  '{}', '{}'),
  ('Apple', 'Apple Watch Series 9',   'Apple Watch Series 9',   'smartwatch', 'apple-watch-series-9',  '{}', '{}'),
  ('Apple', 'Apple Watch Series 10',  'Apple Watch Series 10',  'smartwatch', 'apple-watch-series-10', '{}', '{}'),
  ('Apple', 'Apple Watch Ultra',      'Apple Watch Ultra',      'smartwatch', 'apple-watch-ultra',     '{}', '{}'),
  ('Apple', 'Apple Watch Ultra 2',    'Apple Watch Ultra 2',    'smartwatch', 'apple-watch-ultra-2',   '{}', '{}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Apple — MacBook
-- ============================================================
INSERT INTO product_templates (brand, model, display_name, category, slug, storage_options, colors) VALUES
  ('Apple', 'MacBook Air 13 M1',      'Apple MacBook Air 13 M1',      'laptop', 'apple-macbook-air-13-m1',      '{}', '{}'),
  ('Apple', 'MacBook Air 13 M2',      'Apple MacBook Air 13 M2',      'laptop', 'apple-macbook-air-13-m2',      '{}', '{}'),
  ('Apple', 'MacBook Air 13 M3',      'Apple MacBook Air 13 M3',      'laptop', 'apple-macbook-air-13-m3',      '{}', '{}'),
  ('Apple', 'MacBook Air 15 M2',      'Apple MacBook Air 15 M2',      'laptop', 'apple-macbook-air-15-m2',      '{}', '{}'),
  ('Apple', 'MacBook Air 15 M3',      'Apple MacBook Air 15 M3',      'laptop', 'apple-macbook-air-15-m3',      '{}', '{}'),
  ('Apple', 'MacBook Pro 13 M1',      'Apple MacBook Pro 13 M1',      'laptop', 'apple-macbook-pro-13-m1',      '{}', '{}'),
  ('Apple', 'MacBook Pro 13 M2',      'Apple MacBook Pro 13 M2',      'laptop', 'apple-macbook-pro-13-m2',      '{}', '{}'),
  ('Apple', 'MacBook Pro 14 M1 Pro',  'Apple MacBook Pro 14 M1 Pro',  'laptop', 'apple-macbook-pro-14-m1-pro',  '{}', '{}'),
  ('Apple', 'MacBook Pro 14 M2 Pro',  'Apple MacBook Pro 14 M2 Pro',  'laptop', 'apple-macbook-pro-14-m2-pro',  '{}', '{}'),
  ('Apple', 'MacBook Pro 14 M3 Pro',  'Apple MacBook Pro 14 M3 Pro',  'laptop', 'apple-macbook-pro-14-m3-pro',  '{}', '{}'),
  ('Apple', 'MacBook Pro 14 M4 Pro',  'Apple MacBook Pro 14 M4 Pro',  'laptop', 'apple-macbook-pro-14-m4-pro',  '{}', '{}'),
  ('Apple', 'MacBook Pro 16 M1 Pro',  'Apple MacBook Pro 16 M1 Pro',  'laptop', 'apple-macbook-pro-16-m1-pro',  '{}', '{}'),
  ('Apple', 'MacBook Pro 16 M2 Pro',  'Apple MacBook Pro 16 M2 Pro',  'laptop', 'apple-macbook-pro-16-m2-pro',  '{}', '{}'),
  ('Apple', 'MacBook Pro 16 M3 Pro',  'Apple MacBook Pro 16 M3 Pro',  'laptop', 'apple-macbook-pro-16-m3-pro',  '{}', '{}'),
  ('Apple', 'MacBook Pro 16 M4 Pro',  'Apple MacBook Pro 16 M4 Pro',  'laptop', 'apple-macbook-pro-16-m4-pro',  '{}', '{}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Samsung — Galaxy S series
-- ============================================================
INSERT INTO product_templates (brand, model, display_name, category, slug, storage_options, colors) VALUES
  ('Samsung', 'Galaxy S21',       'Samsung Galaxy S21',       'smartphone', 'samsung-galaxy-s21',       '{}', '{}'),
  ('Samsung', 'Galaxy S21+',      'Samsung Galaxy S21+',      'smartphone', 'samsung-galaxy-s21-plus',  '{}', '{}'),
  ('Samsung', 'Galaxy S21 Ultra', 'Samsung Galaxy S21 Ultra', 'smartphone', 'samsung-galaxy-s21-ultra', '{}', '{}'),
  ('Samsung', 'Galaxy S22',       'Samsung Galaxy S22',       'smartphone', 'samsung-galaxy-s22',       '{}', '{}'),
  ('Samsung', 'Galaxy S22+',      'Samsung Galaxy S22+',      'smartphone', 'samsung-galaxy-s22-plus',  '{}', '{}'),
  ('Samsung', 'Galaxy S22 Ultra', 'Samsung Galaxy S22 Ultra', 'smartphone', 'samsung-galaxy-s22-ultra', '{}', '{}'),
  ('Samsung', 'Galaxy S23',       'Samsung Galaxy S23',       'smartphone', 'samsung-galaxy-s23',       '{}', '{}'),
  ('Samsung', 'Galaxy S23+',      'Samsung Galaxy S23+',      'smartphone', 'samsung-galaxy-s23-plus',  '{}', '{}'),
  ('Samsung', 'Galaxy S23 Ultra', 'Samsung Galaxy S23 Ultra', 'smartphone', 'samsung-galaxy-s23-ultra', '{}', '{}'),
  ('Samsung', 'Galaxy S24',       'Samsung Galaxy S24',       'smartphone', 'samsung-galaxy-s24',       '{}', '{}'),
  ('Samsung', 'Galaxy S24+',      'Samsung Galaxy S24+',      'smartphone', 'samsung-galaxy-s24-plus',  '{}', '{}'),
  ('Samsung', 'Galaxy S24 Ultra', 'Samsung Galaxy S24 Ultra', 'smartphone', 'samsung-galaxy-s24-ultra', '{}', '{}'),
  ('Samsung', 'Galaxy S25',       'Samsung Galaxy S25',       'smartphone', 'samsung-galaxy-s25',       '{}', '{}'),
  ('Samsung', 'Galaxy S25+',      'Samsung Galaxy S25+',      'smartphone', 'samsung-galaxy-s25-plus',  '{}', '{}'),
  ('Samsung', 'Galaxy S25 Ultra', 'Samsung Galaxy S25 Ultra', 'smartphone', 'samsung-galaxy-s25-ultra', '{}', '{}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Samsung — Galaxy A series
-- ============================================================
INSERT INTO product_templates (brand, model, display_name, category, slug, storage_options, colors) VALUES
  ('Samsung', 'Galaxy A14', 'Samsung Galaxy A14', 'smartphone', 'samsung-galaxy-a14', '{}', '{}'),
  ('Samsung', 'Galaxy A15', 'Samsung Galaxy A15', 'smartphone', 'samsung-galaxy-a15', '{}', '{}'),
  ('Samsung', 'Galaxy A25', 'Samsung Galaxy A25', 'smartphone', 'samsung-galaxy-a25', '{}', '{}'),
  ('Samsung', 'Galaxy A34', 'Samsung Galaxy A34', 'smartphone', 'samsung-galaxy-a34', '{}', '{}'),
  ('Samsung', 'Galaxy A35', 'Samsung Galaxy A35', 'smartphone', 'samsung-galaxy-a35', '{}', '{}'),
  ('Samsung', 'Galaxy A54', 'Samsung Galaxy A54', 'smartphone', 'samsung-galaxy-a54', '{}', '{}'),
  ('Samsung', 'Galaxy A55', 'Samsung Galaxy A55', 'smartphone', 'samsung-galaxy-a55', '{}', '{}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Samsung — Galaxy Z Fold / Flip
-- ============================================================
INSERT INTO product_templates (brand, model, display_name, category, slug, storage_options, colors) VALUES
  ('Samsung', 'Galaxy Z Flip 5', 'Samsung Galaxy Z Flip 5', 'smartphone', 'samsung-galaxy-z-flip-5', '{}', '{}'),
  ('Samsung', 'Galaxy Z Flip 6', 'Samsung Galaxy Z Flip 6', 'smartphone', 'samsung-galaxy-z-flip-6', '{}', '{}'),
  ('Samsung', 'Galaxy Z Fold 5', 'Samsung Galaxy Z Fold 5', 'smartphone', 'samsung-galaxy-z-fold-5', '{}', '{}'),
  ('Samsung', 'Galaxy Z Fold 6', 'Samsung Galaxy Z Fold 6', 'smartphone', 'samsung-galaxy-z-fold-6', '{}', '{}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Samsung — Galaxy Tab
-- ============================================================
INSERT INTO product_templates (brand, model, display_name, category, slug, storage_options, colors) VALUES
  ('Samsung', 'Galaxy Tab S9',       'Samsung Galaxy Tab S9',       'tablet', 'samsung-galaxy-tab-s9',       '{}', '{}'),
  ('Samsung', 'Galaxy Tab S9+',      'Samsung Galaxy Tab S9+',      'tablet', 'samsung-galaxy-tab-s9-plus',  '{}', '{}'),
  ('Samsung', 'Galaxy Tab S9 Ultra', 'Samsung Galaxy Tab S9 Ultra', 'tablet', 'samsung-galaxy-tab-s9-ultra', '{}', '{}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Google — Pixel
-- ============================================================
INSERT INTO product_templates (brand, model, display_name, category, slug, storage_options, colors) VALUES
  ('Google', 'Pixel 7',     'Google Pixel 7',     'smartphone', 'google-pixel-7',     '{}', '{}'),
  ('Google', 'Pixel 7 Pro', 'Google Pixel 7 Pro', 'smartphone', 'google-pixel-7-pro', '{}', '{}'),
  ('Google', 'Pixel 7a',    'Google Pixel 7a',    'smartphone', 'google-pixel-7a',    '{}', '{}'),
  ('Google', 'Pixel 8',     'Google Pixel 8',     'smartphone', 'google-pixel-8',     '{}', '{}'),
  ('Google', 'Pixel 8 Pro', 'Google Pixel 8 Pro', 'smartphone', 'google-pixel-8-pro', '{}', '{}'),
  ('Google', 'Pixel 8a',    'Google Pixel 8a',    'smartphone', 'google-pixel-8a',    '{}', '{}'),
  ('Google', 'Pixel 9',     'Google Pixel 9',     'smartphone', 'google-pixel-9',     '{}', '{}'),
  ('Google', 'Pixel 9 Pro', 'Google Pixel 9 Pro', 'smartphone', 'google-pixel-9-pro', '{}', '{}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- OnePlus
-- ============================================================
INSERT INTO product_templates (brand, model, display_name, category, slug, storage_options, colors) VALUES
  ('OnePlus', 'OnePlus 11',        'OnePlus 11',        'smartphone', 'oneplus-11',         '{}', '{}'),
  ('OnePlus', 'OnePlus 12',        'OnePlus 12',        'smartphone', 'oneplus-12',         '{}', '{}'),
  ('OnePlus', 'OnePlus Nord 3',    'OnePlus Nord 3',    'smartphone', 'oneplus-nord-3',     '{}', '{}'),
  ('OnePlus', 'OnePlus Nord CE 3', 'OnePlus Nord CE 3', 'smartphone', 'oneplus-nord-ce-3',  '{}', '{}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Huawei
-- ============================================================
INSERT INTO product_templates (brand, model, display_name, category, slug, storage_options, colors) VALUES
  ('Huawei', 'Huawei P60 Pro',   'Huawei P60 Pro',   'smartphone', 'huawei-p60-pro',   '{}', '{}'),
  ('Huawei', 'Huawei P50 Pro',   'Huawei P50 Pro',   'smartphone', 'huawei-p50-pro',   '{}', '{}'),
  ('Huawei', 'Huawei Mate 50 Pro','Huawei Mate 50 Pro','smartphone','huawei-mate-50-pro','{}', '{}')
ON CONFLICT (slug) DO NOTHING;

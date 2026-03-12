-- 20260312_008_seed_data.sql
-- Initial data: locations and reference data

INSERT INTO locations (name, address, type, phone, email) VALUES
  ('Slagelse', 'Slagelse, Denmark', 'store', NULL, 'slagelse@phonespot.dk'),
  ('Vejle', 'Vejle, Denmark', 'store', NULL, 'vejle@phonespot.dk'),
  ('Online', 'phonespot.dk', 'online', NULL, 'info@phonespot.dk')
ON CONFLICT DO NOTHING;

-- Initial T&C version (placeholder — content managed separately)
INSERT INTO tc_versions (version, content_hash, published_at) VALUES
  ('1.0', 'initial', NOW())
ON CONFLICT DO NOTHING;

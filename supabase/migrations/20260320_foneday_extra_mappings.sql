-- Add missing Foneday category mappings
-- "Booktypes Case", "Softcase", "Hardcase" etc. should all map to "cover"
INSERT INTO foneday_category_map (map_type, foneday_value, phonespot_value, display_label) VALUES
  ('category', 'Booktypes Case', 'cover', 'Covers & Cases'),
  ('category', 'Softcase', 'cover', 'Covers & Cases'),
  ('category', 'Hardcase', 'cover', 'Covers & Cases'),
  ('category', 'Bumper', 'cover', 'Covers & Cases'),
  ('category', 'Flipcase', 'cover', 'Covers & Cases'),
  ('category', 'Back Cover', 'cover', 'Covers & Cases'),
  ('category', 'Edge to Edge', 'screen_protector', 'Skaermbeskyttelse'),
  ('category', 'Tempered Glass', 'screen_protector', 'Skaermbeskyttelse'),
  ('category', 'Screen Protector', 'screen_protector', 'Skaermbeskyttelse'),
  ('category', 'Powerbank', 'charger', 'Opladere'),
  ('category', 'Wireless Charger', 'charger', 'Opladere'),
  ('category', 'Car Charger', 'charger', 'Opladere'),
  ('category', 'Wall Charger', 'charger', 'Opladere'),
  ('category', 'Headset', 'audio', 'Lyd & Hoeretelefoner'),
  ('category', 'Speaker', 'audio', 'Lyd & Hoeretelefoner'),
  ('category', 'Earbuds', 'audio', 'Lyd & Hoeretelefoner'),
  ('category', 'Holder', 'other', 'Holdere'),
  ('category', 'Car Mount', 'other', 'Holdere'),
  ('category', 'Stylus', 'other', 'Tilbehoer')
ON CONFLICT (map_type, foneday_value) DO NOTHING;

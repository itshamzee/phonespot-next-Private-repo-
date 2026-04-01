-- Seed: 31 spare part categories + 6 quality tiers
-- Idempotent via ON CONFLICT (slug) DO NOTHING

-- ============================================================
-- Spare Part Categories
-- ============================================================

INSERT INTO spare_part_categories (name, slug, icon, description, hero_title, hero_subtitle, default_warranty_months, sort_order) VALUES
  ('Skærm', 'skaerme', 'monitor', 'Skærme i alle kvaliteter til telefoner, tablets og laptops', 'Skærme til alle enheder', 'Originale og premium skærme med op til 2 års garanti. Fra In-Cell til Service Pack.', NULL, 1),
  ('Batteri', 'batterier', 'battery', 'Batterier til alle enheder med 3 måneders garanti', 'Batterier til alle enheder', 'Originale og OEM-batterier med 3 måneders garanti. Levering i hele Danmark.', 3, 2),
  ('Bagcover', 'bagcovers', 'smartphone', 'Bagcovers og bagsider til alle telefonmodeller', 'Bagcovers til alle enheder', 'Originale og premium bagcovers med op til 2 års garanti.', NULL, 3),
  ('Frame', 'frames', 'square', 'Frames og rammedele til alle enheder', 'Frames til alle enheder', 'Originale og OEM frames med garanti. Find den rigtige ramme til din enhed.', NULL, 4),
  ('Opladningsstik', 'opladningsstik', 'plug', 'Opladningsstik og ladestik til alle enheder', 'Opladningsstik til alle enheder', 'Originale og premium opladningsstik med garanti.', NULL, 5),
  ('Kamera', 'kameraer', 'camera', 'Kameramoduler til alle enheder', 'Kameraer til alle enheder', 'Originale og OEM kameramoduler med garanti.', NULL, 6),
  ('Kameralinse', 'kameralinser', 'aperture', 'Kameralinser og linsebeskyttelse', 'Kameralinser til alle enheder', 'Originale kameralinser med garanti.', NULL, 7),
  ('Højttaler', 'hojttalere', 'volume-2', 'Højttalere og lydmoduler til alle enheder', 'Højttalere til alle enheder', 'Originale og OEM højttalere med garanti.', NULL, 8),
  ('Home-knap', 'home-knapper', 'circle', 'Home-knapper og Touch ID moduler', 'Home-knapper til alle enheder', 'Originale home-knapper med garanti.', NULL, 9),
  ('Fingeraftryk', 'fingeraftryk', 'fingerprint', 'Fingeraftrykssensorer og moduler', 'Fingeraftryk-sensorer til alle enheder', 'Originale fingeraftrykssensorer med garanti.', NULL, 10),
  ('Flex-kabel', 'flex-kabler', 'cable', 'Flex-kabler og forbindelseskabler', 'Flex-kabler til alle enheder', 'Flex-kabler i alle typer med garanti.', NULL, 11),
  ('NFC', 'nfc', 'wifi', 'NFC-antenner og moduler', 'NFC-moduler til alle enheder', 'Originale NFC-moduler med garanti.', NULL, 12),
  ('Power/Volume-knap', 'power-volume-knapper', 'sliders-horizontal', 'Power- og volume-knapper og flex', 'Power/Volume-knapper til alle enheder', 'Originale knapper og flex-kabler med garanti.', NULL, 13),
  ('MagSafe', 'magsafe', 'magnet', 'MagSafe-moduler og magneter', 'MagSafe-dele til alle enheder', 'Originale MagSafe-moduler med garanti.', NULL, 14),
  ('Blæser', 'blaesere', 'fan', 'Blæsere og køleløsninger til laptops', 'Blæsere til MacBook og laptops', 'Originale blæsere med garanti.', NULL, 15),
  ('SIM-kortholder', 'sim-kortholdere', 'sim-card', 'SIM-kortholdere og trays', 'SIM-kortholdere til alle enheder', 'SIM-kortholdere i alle farver.', NULL, 16),
  ('Klæbebånd', 'klaebebaand', 'tape', 'Klæbebånd og adhesive til reparation', 'Klæbebånd til reparation', 'Professionelt klæbebånd til alle reparationstyper.', NULL, 17),
  ('Hoved/Display Flex', 'hoved-display-flex', 'cable', 'Hoved- og display flex-kabler', 'Hoved/Display Flex til alle enheder', 'Originale flex-kabler med garanti.', NULL, 18),
  ('Wifi/Antenne/Bluetooth', 'wifi-antenne-bluetooth', 'wifi', 'Wifi-, antenne- og Bluetooth-moduler', 'Wifi/Antenne/Bluetooth til alle enheder', 'Originale trådløse moduler med garanti.', NULL, 19),
  ('Skruer/Knapper', 'skruer-knapper', 'wrench', 'Skruesæt og fysiske knapper', 'Skruer og knapper til alle enheder', 'Komplette skruesæt og knapper.', NULL, 20),
  ('Hovedtelefon/Mikrofon', 'hovedtelefon-mikrofon', 'headphones', 'Hovedtelefonstik og mikrofoner', 'Hovedtelefon/Mikrofon til alle enheder', 'Originale lyd-komponenter med garanti.', NULL, 21),
  ('Tastaturer', 'tastaturer', 'keyboard', 'Tastaturer til MacBook og laptops', 'Tastaturer til MacBook og laptops', 'Originale tastaturer med garanti.', NULL, 22),
  ('Buzzer', 'buzzere', 'bell', 'Vibrationsmotorer og buzzere', 'Buzzere til alle enheder', 'Originale vibrationsmotorer med garanti.', NULL, 23),
  ('Flash/Sensor', 'flash-sensor', 'zap', 'Flash-moduler og sensorer', 'Flash/Sensor til alle enheder', 'Originale flash-moduler og sensorer.', NULL, 24),
  ('Touchpad', 'touchpads', 'mouse-pointer', 'Touchpads til MacBook og laptops', 'Touchpads til MacBook og laptops', 'Originale touchpads med garanti.', NULL, 25),
  ('Beslag', 'beslag', 'brackets', 'Beslag, holders og interne dele', 'Beslag til alle enheder', 'Interne beslag og monteringsdele.', NULL, 26),
  ('Touchbar', 'touchbars', 'monitor', 'Touchbar-moduler til MacBook Pro', 'Touchbar til MacBook Pro', 'Originale Touchbar-moduler med garanti.', NULL, 27),
  ('HDD SATA Kabel', 'hdd-sata-kabler', 'hard-drive', 'HDD/SSD SATA-kabler til MacBook', 'HDD SATA Kabler til MacBook', 'Originale SATA-kabler med garanti.', NULL, 28),
  ('Stylus Pen', 'stylus-pens', 'pen-tool', 'Stylus pens og S Pen dele', 'Stylus Pens', 'Stylus pen dele og reservedele.', NULL, 29),
  ('Enter-tast', 'enter-taster', 'corner-down-left', 'Enter-taster og keycaps', 'Enter-taster til laptops', 'Enkelttaster og keycaps.', NULL, 30),
  ('Andet', 'andet', 'more-horizontal', 'Andre reservedele og komponenter', 'Andre reservedele', 'Diverse reservedele og komponenter.', NULL, 99)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Quality Tiers
-- ============================================================

INSERT INTO spare_part_quality_tiers (name, slug, badge_color, badge_text_color, description, short_description, default_warranty_months, sort_order) VALUES
  ('Service Pack', 'service-pack', '#1A3D2E', '#FFFFFF',
   'Originale dele fremstillet af enhedens producent i et certificeret produktionsmiljø. Identisk med den del der sad i enheden fra fabrikken. Leveres i original emballage med alle nødvendige komponenter. Den absolut bedste kvalitet til krævende reparationer.',
   'Original fra producenten — fabrikskvalitet',
   24, 1),
  ('Original (Pulled)', 'original-pulled', '#2D5A3D', '#FFFFFF',
   '100% autentiske dele fjernet fra originale brugte enheder. Gennemgår streng inspektion og funktionstest før salg. Ægte producentkvalitet til en lavere pris end Service Pack. Kan have minimale kosmetiske spor fra tidligere brug.',
   '100% autentisk fra brugt enhed — testet og inspiceret',
   24, 2),
  ('Premium Soft OLED', 'premium-soft-oled', '#0071E3', '#FFFFFF',
   'Soft OLED-skærm med fleksibelt substrat der giver dybe sortniveauer, levende farver og lav strømforbrug. Glat og præcis touch-respons med høj opdateringshastighed. Tyndere og lettere end Hard OLED. Fremragende til hverdagsbrug og professionelle reparationer.',
   'Soft OLED — levende farver, fleksibelt substrat',
   18, 3),
  ('Premium Hard OLED', 'premium-hard-oled', '#5856D6', '#FFFFFF',
   'Hard OLED-skærm med skarp billedkvalitet, høj kontrast og hurtig touch-respons. Robust konstruktion med stift glassubstrat. Levende farvegengivelse og brede betragtningsvinkler. Et solidt valg til kvalitetsbevidste reparationer.',
   'Hard OLED — skarp billedkvalitet, robust konstruktion',
   18, 4),
  ('Refurbished', 'refurbished', '#4A7C5B', '#FFFFFF',
   'Original del fra brugt enhed hvor slidte komponenter (f.eks. frontglas) er udskiftet med nye af høj kvalitet. Kombinerer originaldelens farvepræcision og touch-respons med fabriksnye komponenter. Grundigt testet og kvalitetskontrolleret.',
   'Original del med nyt frontglas — testet og kontrolleret',
   12, 5),
  ('Standard In-Cell', 'standard-incell', '#86868B', '#FFFFFF',
   'In-Cell LCD-skærm hvor touch-laget er integreret direkte i displayet. HD-opløsning med god farvegengivelse til prisen. Den mest budgetvenlige løsning der stadig leverer pålidelig daglig ydeevne. Ideel til prisbevidste kunder.',
   'In-Cell LCD — budgetvenlig med pålidelig ydeevne',
   12, 6)
ON CONFLICT (slug) DO NOTHING;

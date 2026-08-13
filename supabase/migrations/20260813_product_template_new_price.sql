-- Add a real recommended-retail-price field so "compare at" pricing can stop
-- borrowing base_price_a (PhoneSpot's own Grade A selling price) as a stand-in
-- for "new price". base_price_a is what WE charge for a refurbished Grade A
-- unit — showing it struck-through as "Nypris" misrepresents our own price as
-- the manufacturer's new price, which understates savings on older models and
-- is misleading under markedsføringsloven.
--
-- new_price is nullable and, unlike base_price_a/b/c, is never auto-derived —
-- it must be entered by hand (or backfilled from a verified source) per model.
-- Stored in øre, matching every other price column on this table.

ALTER TABLE product_templates
  ADD COLUMN IF NOT EXISTS new_price integer;

COMMENT ON COLUMN product_templates.new_price IS
  'Vejledende nypris (i øre) — den faktiske pris på enheden som fabriksny. Bruges til at vise en ægte "spar X%" sammenligning. Må ALDRIG udledes af base_price_a/b/c/n/p, som er PhoneSpots egne refurbished-priser.';

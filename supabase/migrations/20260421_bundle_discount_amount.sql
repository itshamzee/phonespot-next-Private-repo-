-- Add bundle_discount_amount column to orders table.
-- Stores the total Spot bundle discount (3-for-2 + Lens combo) in øre,
-- separate from promo-code discount_amount for reporting clarity.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS bundle_discount_amount INTEGER NOT NULL DEFAULT 0;

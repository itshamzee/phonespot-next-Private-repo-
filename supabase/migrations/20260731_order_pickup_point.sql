-- The parcel shop the customer chose at checkout.
--
-- Checkout offered "afhentning i nærmeste pakkeshop" without ever asking which
-- one, so a parcel-shop order could not actually be booked: the carrier needs a
-- service point id. Kept as jsonb because we show the name, address and opening
-- hours back to the customer, not just the id.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pickup_point jsonb;

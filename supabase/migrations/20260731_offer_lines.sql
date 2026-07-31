-- Per-device breakdown on a buyback offer.
--
-- The offer stays one row with one amount the customer accepts all or nothing.
-- offer_lines says what each device is worth and which ones we are not buying,
-- so the offer email and the slutseddel can show the split.
--
-- NULL means the offer predates the column and renders as a single amount.
-- A per-device exclusion is deliberately NOT written to buyback_declines: that
-- table drives deriveTradeInStatus, and a partial exclusion would make the whole
-- lead read as declined even though an offer went out.

ALTER TABLE trade_in_offers
  ADD COLUMN IF NOT EXISTS offer_lines jsonb;

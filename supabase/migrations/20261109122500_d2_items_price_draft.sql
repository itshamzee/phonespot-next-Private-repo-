-- D2: kladde-varelinjer kan gemmes (autosave) før prisen er sat; 0 betyder "ikke sat".
-- trade_in_confirm afviser stadig price <= 0 (item_invalid), så en seddel kan ikke bekræftes uden pris.
ALTER TABLE public.trade_in_receipt_items DROP CONSTRAINT IF EXISTS trade_in_receipt_items_price_check;
ALTER TABLE public.trade_in_receipt_items ADD CONSTRAINT trade_in_receipt_items_price_check CHECK (price >= 0);

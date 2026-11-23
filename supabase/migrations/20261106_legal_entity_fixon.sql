-- Fixon ApS (CVR 46079019) is the legal entity behind PhoneSpot from 2026-11-06.
-- Only new documents change: existing slutsedler keep the buyer they were
-- issued under, because a bookkeeping voucher must never be rewritten.
UPDATE company_settings SET cvr = '46079019', updated_at = now();

ALTER TABLE trade_in_receipts ALTER COLUMN buyer_company SET DEFAULT 'Fixon ApS';
ALTER TABLE trade_in_receipts ALTER COLUMN buyer_cvr SET DEFAULT '46079019';

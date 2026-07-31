-- Store where the label PDF lives, not a link that dies.
--
-- label_url held a signed URL with seven days' expiry, written once and kept
-- forever, so every label became "kan ikke indlæses" a week after it was made.
-- The path is stable; a fresh signed URL is minted per request instead.

ALTER TABLE shipping_labels
  ADD COLUMN IF NOT EXISTS label_path text;

-- Backfill what can be recovered: the filename has always been label-<offer>.pdf
UPDATE shipping_labels
   SET label_path = 'label-' || offer_id || '.pdf'
 WHERE label_path IS NULL;

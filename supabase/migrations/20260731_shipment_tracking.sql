-- Carrier tracking on buyback shipments, and the moment a device is in our hands.
--
-- shipping_labels.status was set to 'label_created' at insert and never touched
-- again: there was no webhook and no polling, so "accepted" covered everything
-- from "label not sent" to "the parcel has sat unopened in the back room".
--
-- carrier_status keeps Shipmondo's own wording untouched, so a status we do not
-- recognise can still be read afterwards instead of vanishing into our own
-- simplification.

ALTER TABLE shipping_labels
  ADD COLUMN IF NOT EXISTS in_transit_at  timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at   timestamptz,
  ADD COLUMN IF NOT EXISTS last_event_at  timestamptz,
  ADD COLUMN IF NOT EXISTS carrier_status text;

-- Finding the shipments the daily sweep needs to re-check.
CREATE INDEX IF NOT EXISTS idx_shipping_labels_open
  ON shipping_labels (created_at)
  WHERE delivered_at IS NULL;

-- Looking a parcel up from a webhook, which knows the tracking number and
-- nothing else.
CREATE INDEX IF NOT EXISTS idx_shipping_labels_tracking
  ON shipping_labels (tracking_number)
  WHERE tracking_number IS NOT NULL;

-- "Received" is ours, not the carrier's: a parcel PostNord has delivered is not
-- the same as a device someone has opened and checked. It lives on the offer,
-- not the label, because a device can also be handed in at the store without
-- ever having had a label.
ALTER TABLE trade_in_offers
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_by text;

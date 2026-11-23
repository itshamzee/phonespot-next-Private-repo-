-- Opfølgning på opkøbstilbud: påmindelser, udløb og "har du sendt den?".
-- Én række pr. (tilbud, trin, kanal). Unik-nøglen er det, der forhindrer, at to
-- samtidige kørsler sender samme påmindelse to gange: rækken indsættes FØR der
-- sendes, og en kørsel der taber kapløbet springer over.

CREATE TABLE IF NOT EXISTS buyback_followups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id   uuid NOT NULL REFERENCES trade_in_offers(id) ON DELETE CASCADE,
  inquiry_id uuid REFERENCES contact_inquiries(id) ON DELETE SET NULL,
  kind       text NOT NULL CHECK (kind IN ('reminder_24h','reminder_72h','expired','ship_3d','ship_7d','manual')),
  channel    text NOT NULL CHECK (channel IN ('email','sms','none')),
  ok         boolean,
  error      text,
  sent_by    text NOT NULL DEFAULT 'System',
  sent_at    timestamptz NOT NULL DEFAULT now()
);

-- 'manual' kan sendes flere gange; automatiske trin kun én gang pr. kanal.
CREATE UNIQUE INDEX IF NOT EXISTS buyback_followups_once
  ON buyback_followups (offer_id, kind, channel)
  WHERE kind <> 'manual';

CREATE INDEX IF NOT EXISTS idx_buyback_followups_offer
  ON buyback_followups (offer_id, sent_at DESC);

ALTER TABLE buyback_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS buyback_followups_staff_read ON buyback_followups;
CREATE POLICY buyback_followups_staff_read ON buyback_followups
  FOR SELECT TO authenticated
  USING (is_staff());

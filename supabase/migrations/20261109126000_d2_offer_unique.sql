-- D2: ét accepteret tilbud kan kun ligge på én ikke-annulleret slutseddel.
-- Ellers kunne samme online-accept fritage flere sedler for underskrift.
-- API'et oversætter brud til 409 "Tilbuddet er allerede brugt på en anden slutseddel".
CREATE UNIQUE INDEX IF NOT EXISTS trade_in_receipts_offer_once
  ON public.trade_in_receipts (offer_id)
  WHERE offer_id IS NOT NULL AND status <> 'voided';

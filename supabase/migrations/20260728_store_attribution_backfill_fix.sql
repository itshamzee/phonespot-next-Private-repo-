-- Retter backfillen fra 20260728_store_attribution.sql.
--
-- Sælg-enhed-wizarden har et butiksfelt med default "Slagelse", og det gemmes i
-- metadata på ALLE henvendelser — også dem hvor kunden valgte forsendelse og
-- aldrig så butiksvalget. Backfillen kopierede feltet ubetinget, så 62 rækker
-- (61 Slagelse + 1 Vejle) fik en butik kunden aldrig har valgt.
--
-- Et filter der viser forkerte tal er værre end intet filter: nulstil dem, så
-- de står som generelle. Wizarden sender nu selv kun store_id ved butiksaflevering.

UPDATE contact_inquiries
SET store_id = NULL
WHERE store_id IS NOT NULL
  AND source = 'saelg-enhed'
  AND coalesce(metadata->>'deliveryMethod', '') <> 'Aflever i butik';

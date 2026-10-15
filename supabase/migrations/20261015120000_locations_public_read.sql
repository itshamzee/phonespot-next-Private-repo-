-- Kassen læser butikker (locations) med browser-klienten. Politikken locations_public_read
-- (fra 20260312_005_staff_auth.sql) var forsvundet i prod, så RLS gav en tom liste og kassen
-- stod uden butik/kasse ("ingen lokation valgt", Opkræv grå). Butiksnavne er offentlige.
-- Allerede kørt i prod 2026-10-15.
DROP POLICY IF EXISTS locations_public_read ON public.locations;
CREATE POLICY locations_public_read ON public.locations FOR SELECT USING (TRUE);

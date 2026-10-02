-- 20261003110000_repair_photos_private.sql
--
-- GDPR: indleveringsfotos (kundens enhed, skærm med personlige data, IMEI) lå i
-- en offentlig bucket med en "Anyone can view"-policy (001_repair_system.sql).
-- Bucketen gøres privat; koden udleverer korte signerede URL'er
-- (src/lib/repairs/photo-storage.ts). Upload sker fra serveren (service role),
-- så authenticated-INSERT-policyen kan blive, men offentlig læsning fjernes.
--
-- Idempotent. Eksisterende filer i `device-photos/intake|checklist` flyttes af
-- scripts/migrate-repair-photos-private.mjs (kører man selv; se scriptet).

INSERT INTO storage.buckets (id, name, public)
VALUES ('repair-photos', 'repair-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Anyone can view repair photos" ON storage.objects;

-- Personalet må læse via Supabase-sessionen (signerede URL'er laves server-side
-- med service role og kræver ikke policyen, men indbyggede kald gør).
DROP POLICY IF EXISTS "Staff can view repair photos" ON storage.objects;
CREATE POLICY "Staff can view repair photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'repair-photos'
    AND EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_id = auth.uid() AND s.is_active)
  );

-- Verifikation:
--   SELECT id, public FROM storage.buckets WHERE id = 'repair-photos';          -- public = false
--   SELECT policyname FROM pg_policies
--     WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname ILIKE '%repair photos%';
--   -- "Anyone can view repair photos" må ikke findes længere.

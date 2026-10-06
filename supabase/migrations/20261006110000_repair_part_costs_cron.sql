-- Daglig kostpris på reparationsdele fra Foneday (titel-match), kl. 06:30 UTC efter foneday-sync.
--
-- Kører i databasen via pg_cron: en kørsel tager ca. 40 sekunder og når ikke igennem PostgREST'
-- tidsgrænse fra en Vercel-cron. Funktionen skriver kun kostpris, hvor den er tom eller allerede
-- kommer fra Foneday (se 20261006100000); salgspriser og manuelle kostpriser røres aldrig.
--
-- KØRES FØRST, NÅR EJEREN HAR GODKENDT KOSTPRISOPDATERINGEN (tørkørsel 2026-10-06: 297 dele).

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'repair-part-costs';
    PERFORM cron.schedule('repair-part-costs', '30 6 * * *', 'SELECT public.repair_parts_refresh_costs(false)');
  ELSE
    RAISE NOTICE 'pg_cron ikke installeret; repair-part-costs ikke planlagt';
  END IF;
END
$$;

COMMIT;

-- Verifikation: SELECT jobname, schedule FROM cron.job WHERE jobname = 'repair-part-costs';  -- 30 6 * * *

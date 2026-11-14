-- Prøv ventende "Dele brugt"-bevægelser igen hvert minut via pg_cron + pg_net
-- (spec 2026-10-13 §4.2; samme mønster som 20260916_mail_agent_schedule.sql).
-- CRON_SECRET indsættes ved kørsel; commit aldrig den rigtige værdi.
-- Kør: node scripts/run-sql.mjs <fil med __CRON_SECRET__ erstattet>.
-- Ruten svarer {skipped:"not_configured"} indtil LAGERSYSTEM_* er sat, så jobbet
-- er ufarligt at planlægge før skiftedagen.

SELECT cron.unschedule('lagersystem-outbox')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lagersystem-outbox');

SELECT cron.schedule(
  'lagersystem-outbox',
  '* * * * *',
  $$ SELECT net.http_get('https://phonespot.dk/api/cron/lagersystem-outbox', '{}'::jsonb, '{"Authorization": "Bearer __CRON_SECRET__"}'::jsonb, 15000) $$
);

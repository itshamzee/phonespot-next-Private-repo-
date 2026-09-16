-- Planlaeg mailassistenten hvert 20. minut via pg_cron + pg_net (Vercel Hobby
-- tillader kun daglige crons). CRON_SECRET indsaettes ved koersel; commit aldrig
-- den rigtige vaerdi. Koer: node scripts/run-sql.mjs <fil med secret erstattet>.

SELECT cron.unschedule('mail-agent') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mail-agent');

SELECT cron.schedule(
  'mail-agent',
  '*/20 * * * *',
  $$ SELECT net.http_get('https://phonespot.dk/api/cron/mail-agent', '{}'::jsonb, '{"Authorization": "Bearer __CRON_SECRET__"}'::jsonb, 15000) $$
);

-- Opkøbs-opfølgning hver time (5 min over) via pg_cron + pg_net. Vercel Hobby
-- tillader kun daglige crons. CRON_SECRET indsættes ved kørsel; commit aldrig
-- den rigtige værdi. Kør: node scripts/run-sql.mjs <fil med secret erstattet>.

SELECT cron.unschedule('buyback-followup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'buyback-followup');

SELECT cron.schedule(
  'buyback-followup',
  '5 * * * *',
  $$ SELECT net.http_get('https://phonespot.dk/api/cron/buyback-followup', '{}'::jsonb, '{"Authorization": "Bearer __CRON_SECRET__"}'::jsonb, 60000) $$
);

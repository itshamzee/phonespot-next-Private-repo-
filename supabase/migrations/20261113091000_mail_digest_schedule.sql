-- Morgenoverblik fra mail-agenten kl. 06:30 UTC (07:30 dansk vintertid, 08:30
-- sommertid) via pg_cron + pg_net. Vercel Hobby tillader kun daglige crons, og
-- de øvrige jobs ligger her i forvejen. CRON_SECRET indsættes ved kørsel; commit
-- aldrig den rigtige værdi. Kør: node scripts/run-sql.mjs <fil med secret erstattet>.

SELECT cron.unschedule('mail-digest') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mail-digest');

SELECT cron.schedule(
  'mail-digest',
  '30 6 * * *',
  $$ SELECT net.http_get('https://phonespot.dk/api/cron/mail-digest', '{}'::jsonb, '{"Authorization": "Bearer __CRON_SECRET__"}'::jsonb, 120000) $$
);

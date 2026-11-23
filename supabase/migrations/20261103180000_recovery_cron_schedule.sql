-- Kurv-påmindelse hver halve time i stedet for én gang dagligt (Vercel Hobby
-- tillader kun daglige crons). Ruten sender selv kun til kurve forladt for
-- mere end 1 time siden. Genbruger CRON_SECRET fra mail-agent-jobbet, så
-- hemmeligheden aldrig står i en fil.
DO $do$
DECLARE
  v_auth text;
BEGIN
  SELECT substring(command FROM '"Authorization": "(Bearer [^"]+)"') INTO v_auth
  FROM cron.job WHERE jobname = 'mail-agent';
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'mail-agent job mangler — kan ikke hente CRON_SECRET';
  END IF;

  PERFORM cron.unschedule('checkout-recovery') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'checkout-recovery');

  PERFORM cron.schedule(
    'checkout-recovery',
    '7,37 * * * *',
    format(
      $c$ SELECT net.http_get('https://phonespot.dk/api/cron/recovery', '{}'::jsonb, '{"Authorization": "%s"}'::jsonb, 30000) $c$,
      v_auth
    )
  );
END
$do$;

SELECT jobname, schedule, active FROM cron.job WHERE jobname IN ('mail-agent', 'checkout-recovery');

-- Leveringsstatus fra GatewayAPI (callback_url → /api/webhooks/gatewayapi).
-- status siger kun, om GatewayAPI tog imod beskeden; delivery_status siger,
-- om den nåede telefonen (DELIVERED, UNDELIVERABLE, EXPIRED, REJECTED …).
ALTER TABLE public.sms_log
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS delivery_error text,
  ADD COLUMN IF NOT EXISTS delivery_at timestamptz;

CREATE INDEX IF NOT EXISTS sms_log_provider_message_id_idx
  ON public.sms_log (provider_message_id);

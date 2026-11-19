-- Kundeindbakke: kanal-agnostisk datamodel for henvendelser.
-- Idempotent: kan koeres flere gange uden fejl.

-- ============================================================
-- contact_inquiries
-- ============================================================

ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email';
ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS external_thread_id text;
ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS last_inbound_at timestamptz;

ALTER TABLE public.contact_inquiries ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.contact_inquiries DROP CONSTRAINT IF EXISTS contact_inquiries_channel_check;
ALTER TABLE public.contact_inquiries ADD CONSTRAINT contact_inquiries_channel_check
  CHECK (channel IN ('email', 'form', 'sms', 'messenger', 'google_review', 'trustpilot_review'));

-- Backfill kanal: eksplicit kildeliste og external_thread_id IS NULL goer det idempotent,
-- fanger formularraekker oprettet mellem migration og deploy ved genkoersel, og roerer
-- aldrig rigtige mailtraade.
UPDATE public.contact_inquiries SET channel = 'form'
  WHERE channel = 'email'
    AND external_thread_id IS NULL
    AND source IN ('kontaktformular', 'saelg-enhed', 'reparation-booking',
                   'elektronikforsikring', 'erhvervsreparation', 'manuel');

-- Backfill last_inbound_at: kun gamle raekker (foer cutoff), saa en genkoersel ikke
-- udfylder raekker som den nye kode bevidst har ladet vaere NULL.
UPDATE public.contact_inquiries SET last_inbound_at = created_at
  WHERE last_inbound_at IS NULL
    AND created_at < timestamptz '2026-11-19 06:00:00+00';

-- email goeres kun nullable. Eksisterende '' omskrives ikke: koden der er deployet
-- foer migrationen antager at email er en streng.

CREATE UNIQUE INDEX IF NOT EXISTS contact_inquiries_channel_thread_open_idx
  ON public.contact_inquiries (channel, external_thread_id)
  WHERE external_thread_id IS NOT NULL AND status <> 'lukket';

-- ============================================================
-- inquiry_messages
-- ============================================================

-- Den oprindelige inline CHECK (20260310_mega_upgrade.sql) har standardnavnet nedenfor.
ALTER TABLE public.inquiry_messages DROP CONSTRAINT IF EXISTS inquiry_messages_channel_check;
ALTER TABLE public.inquiry_messages ADD CONSTRAINT inquiry_messages_channel_check
  CHECK (channel IN ('email', 'sms', 'form', 'messenger', 'google_review', 'trustpilot_review', 'system'));

ALTER TABLE public.inquiry_messages ADD COLUMN IF NOT EXISTS external_message_id text;
ALTER TABLE public.inquiry_messages ADD COLUMN IF NOT EXISTS delivery_status text;

CREATE UNIQUE INDEX IF NOT EXISTS inquiry_messages_channel_external_id_idx
  ON public.inquiry_messages (channel, external_message_id)
  WHERE external_message_id IS NOT NULL;

-- ============================================================
-- sms_log
-- ============================================================

ALTER TABLE public.sms_log
  ADD COLUMN IF NOT EXISTS inquiry_id uuid REFERENCES public.contact_inquiries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sms_log_inquiry ON public.sms_log (inquiry_id) WHERE inquiry_id IS NOT NULL;

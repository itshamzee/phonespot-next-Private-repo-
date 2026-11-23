-- Fiks: chatassistenten paa sitet. Hver chatsession er en henvendelse med kanal 'chat'.
-- Idempotent: kan koeres flere gange uden fejl.

ALTER TABLE public.contact_inquiries DROP CONSTRAINT IF EXISTS contact_inquiries_channel_check;
ALTER TABLE public.contact_inquiries ADD CONSTRAINT contact_inquiries_channel_check
  CHECK (channel IN ('email', 'form', 'sms', 'messenger', 'google_review', 'trustpilot_review', 'chat'));

ALTER TABLE public.inquiry_messages DROP CONSTRAINT IF EXISTS inquiry_messages_channel_check;
ALTER TABLE public.inquiry_messages ADD CONSTRAINT inquiry_messages_channel_check
  CHECK (channel IN ('email', 'sms', 'form', 'messenger', 'google_review', 'trustpilot_review', 'system', 'chat'));

-- Graenserne (beskeder pr. time, nye sessioner pr. time) taeller paa kanal og tidspunkt.
CREATE INDEX IF NOT EXISTS idx_inquiry_messages_chat_created
  ON public.inquiry_messages (created_at)
  WHERE channel = 'chat' AND sender = 'customer';

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_chat_created
  ON public.contact_inquiries (created_at)
  WHERE channel = 'chat';

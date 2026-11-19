-- Kundecenter: tildeling, udsaettelse, interne noter og Fiks-dom.
-- Additiv og sikker at koere flere gange. Den udrullede kode skal virke uaendret efter koersel.

-- contact_inquiries.assigned_to findes allerede (text, NULL, ubrugt): medarbejderens id gemmes som tekst.
ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS assigned_name text;
ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;

-- Interne noter ligger i traaden, men maa aldrig vises for kunden eller sendes til modellen.
ALTER TABLE public.inquiry_messages ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

-- Ejerens/medarbejderens dom over et udkast fra Fiks.
ALTER TABLE public.ai_drafts ADD COLUMN IF NOT EXISTS review_verdict text;
ALTER TABLE public.ai_drafts ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE public.ai_drafts ADD COLUMN IF NOT EXISTS reviewed_verdict_by text;

ALTER TABLE public.ai_drafts DROP CONSTRAINT IF EXISTS ai_drafts_review_verdict_check;
ALTER TABLE public.ai_drafts ADD CONSTRAINT ai_drafts_review_verdict_check
  CHECK (review_verdict IS NULL OR review_verdict IN ('correct', 'wrong'));

CREATE INDEX IF NOT EXISTS contact_inquiries_assigned_to_idx
  ON public.contact_inquiries (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS contact_inquiries_snoozed_until_idx
  ON public.contact_inquiries (snoozed_until) WHERE snoozed_until IS NOT NULL;

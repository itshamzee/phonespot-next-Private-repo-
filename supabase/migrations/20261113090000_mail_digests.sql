-- Morgenoverblik fra mail-agenten: én række pr. udsendt overbliksmail.
-- message_id er mailens Message-ID med et tilfældigt id. Ejerens svar genkendes
-- på, at det henviser til netop det id (In-Reply-To/References), så en fremmed
-- ikke kan udløse svar til kunder ved at forfalske afsenderen.
-- items er de nummererede punkter, som svaret ("1 ok, 3 luk") peger på.

CREATE TABLE IF NOT EXISTS mail_digests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  text NOT NULL UNIQUE,
  kind        text NOT NULL CHECK (kind IN ('morning', 'followup')),
  recipient   text NOT NULL,
  sent_from   text NOT NULL,
  items       jsonb NOT NULL DEFAULT '[]'::jsonb,
  replies     jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_digests_sent_at ON mail_digests (sent_at DESC);

-- Kun service-rollen (agenten) læser og skriver; ingen policies med vilje.
ALTER TABLE mail_digests ENABLE ROW LEVEL SECURITY;

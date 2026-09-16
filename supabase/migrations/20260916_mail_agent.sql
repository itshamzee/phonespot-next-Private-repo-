-- Mail agent: IMAP-indbakke, AI-forslag og koersler. 2026-09-16.
-- Ingen DO-blokke: scripts/run-sql.mjs splitter paa semikolon.

CREATE TABLE IF NOT EXISTS mail_inbound (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox text NOT NULL,
  imap_uid integer,
  message_id text UNIQUE,
  from_email text,
  from_name text,
  subject text,
  received_at timestamptz,
  classification text,
  inquiry_id uuid REFERENCES contact_inquiries(id) ON DELETE SET NULL,
  inquiry_message_id uuid REFERENCES inquiry_messages(id) ON DELETE SET NULL,
  error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mail_inbound_mailbox_created ON mail_inbound(mailbox, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_inbound_inquiry ON mail_inbound(inquiry_id);

CREATE TABLE IF NOT EXISTS ai_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES contact_inquiries(id) ON DELETE CASCADE,
  trigger_message_id uuid REFERENCES inquiry_messages(id) ON DELETE SET NULL,
  category text NOT NULL,
  needs_human boolean NOT NULL DEFAULT false,
  reason text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  draft_subject text,
  draft_body text,
  lookups jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric(3,2) NOT NULL DEFAULT 0,
  model text NOT NULL DEFAULT '',
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','auto_sent','discarded')),
  final_body text,
  reviewed_by text,
  reviewed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_inquiry ON ai_drafts(inquiry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_pending ON ai_drafts(status) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS mail_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  mailboxes text[] NOT NULL DEFAULT '{}',
  fetched integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  drafted integer NOT NULL DEFAULT 0,
  auto_sent integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS mailbox text;
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE inquiry_messages ADD COLUMN IF NOT EXISTS message_id text;
ALTER TABLE inquiry_messages ADD COLUMN IF NOT EXISTS in_reply_to text;
CREATE INDEX IF NOT EXISTS idx_inquiry_messages_message_id ON inquiry_messages(message_id) WHERE message_id IS NOT NULL;

ALTER TABLE mail_inbound ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_agent_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read mail_inbound" ON mail_inbound;
CREATE POLICY "staff read mail_inbound" ON mail_inbound FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff manage ai_drafts" ON ai_drafts;
CREATE POLICY "staff manage ai_drafts" ON ai_drafts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff read mail_agent_runs" ON mail_agent_runs;
CREATE POLICY "staff read mail_agent_runs" ON mail_agent_runs FOR SELECT TO authenticated USING (true);

INSERT INTO app_settings (key, value)
VALUES ('mail_agent', '{"enabled": true, "autoSendCategories": [], "minConfidence": 0.85}'::jsonb)
ON CONFLICT (key) DO NOTHING;

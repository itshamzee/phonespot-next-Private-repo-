-- Hvilken mappe assistenten har lagt mailen i (INBOX/Kunder/Ordrer osv.). 2026-09-16.
ALTER TABLE mail_inbound ADD COLUMN IF NOT EXISTS folder text;

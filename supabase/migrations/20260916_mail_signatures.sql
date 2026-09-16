-- Mailsignaturer pr. postkasse + CVR og Trustpilot i firmaindstillinger. 2026-09-16.

ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS mailbox text;
CREATE INDEX IF NOT EXISTS idx_staff_profiles_mailbox ON staff_profiles(mailbox) WHERE mailbox IS NOT NULL;

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS cvr text;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS trustpilot_url text;

UPDATE company_settings SET email = 'info@phonespot.dk', cvr = '38688766', trustpilot_url = 'https://dk.trustpilot.com/evaluate/phonespot.dk' WHERE id = true;

INSERT INTO staff_profiles (display_name, title, phone, mailbox, is_active)
SELECT 'Hamza', '', '+45 50 45 33 71', 'ha@phonespot.dk', true
WHERE NOT EXISTS (SELECT 1 FROM staff_profiles WHERE mailbox = 'ha@phonespot.dk');

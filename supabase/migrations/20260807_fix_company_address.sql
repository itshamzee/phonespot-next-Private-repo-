-- Correct the seeded Slagelse address in company_settings.
--
-- 20260317_email_conversations.sql seeded company_settings.address as
-- 'VestsjællandsCentret 10' — missing the building letter and entrance/unit
-- number. src/lib/store-config.ts was already corrected to
-- 'VestsjællandsCentret 10A, 103' (see STORES.slagelse.street), but this
-- table's row overrides that code fallback for contact-reply email footers
-- (src/lib/email/templates/base-layout.tsx), so the live row also needs
-- fixing. Idempotent: only touches the row if it still holds the old value.
UPDATE company_settings
SET address = 'VestsjællandsCentret 10A, 103'
WHERE address = 'VestsjællandsCentret 10';

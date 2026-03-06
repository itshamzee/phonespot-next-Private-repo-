-- Add booking_details JSONB column to repair_tickets
alter table repair_tickets add column if not exists booking_details jsonb;

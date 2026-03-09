-- Add service info columns for tooltips
ALTER TABLE repair_services
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS warranty_info text,
  ADD COLUMN IF NOT EXISTS includes text,
  ADD COLUMN IF NOT EXISTS estimated_time_label text;

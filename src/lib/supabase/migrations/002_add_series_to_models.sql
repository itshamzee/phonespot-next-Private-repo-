-- Add series column for grouping models (e.g. "S-serien", "A-serien", "iPad Pro")
alter table repair_models add column if not exists series text;

-- Index for faster grouping queries
create index if not exists idx_repair_models_series on repair_models(brand_id, series);

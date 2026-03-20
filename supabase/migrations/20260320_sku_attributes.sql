-- Add attributes JSONB column to sku_products for type-specific data
-- Examples: connector_type for cables, watt for chargers, case_type for cases
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}';

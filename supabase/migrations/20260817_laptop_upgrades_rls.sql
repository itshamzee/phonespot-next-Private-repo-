-- 20260817_laptop_upgrades_rls.sql
-- 1) Laas opgraderings-tabellerne af: uden RLS kunne anon-noeglen laese OG
--    skrive priser via PostgREST. Al legitim adgang (PDP-visning via
--    getUpgradeOptionsForTemplate, checkout-prissaetning, admin-CRUD) gaar
--    gennem service-role, som bypasser RLS. Derfor: ingen policies —
--    RLS enabled uden policies = deny-all for anon/authenticated.
ALTER TABLE laptop_upgrade_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_upgrade_options ENABLE ROW LEVEL SECURITY;

-- 2) Modstykke til decrement_foxway_stock (20260325_foxway_integration.sql).
--    Naar en checkout-session udloeber skal den reserverede Foxway-stock
--    tilbage paa lager. Den blinde status='listed'-update i webhooken var
--    forkert for dropship-enheder: den kunne re-liste en enhed med
--    source_stock = 0. Her haeves stock atomisk og status saettes kun til
--    'listed' naar der rent faktisk er stock igen.
CREATE OR REPLACE FUNCTION increment_foxway_stock(p_device_id UUID)
RETURNS INTEGER AS $$
DECLARE affected INTEGER;
BEGIN
  UPDATE devices SET source_stock = COALESCE(source_stock, 0) + 1
  WHERE id = p_device_id AND source = 'foxway';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN
    RETURN 0;
  END IF;
  UPDATE devices SET status = 'listed', reservation_expires_at = NULL
  WHERE id = p_device_id AND source = 'foxway' AND source_stock > 0
    AND status IN ('reserved', 'delisted');
  RETURN affected;
END;
$$ LANGUAGE plpgsql;

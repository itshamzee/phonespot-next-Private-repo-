-- 20260312_009_checkout_rpcs.sql
-- RPCs for checkout webhook: stock decrement and discount usage increment

CREATE OR REPLACE FUNCTION decrement_sku_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE sku_stock
  SET quantity = quantity - p_quantity,
      updated_at = NOW()
  FROM locations
  WHERE sku_stock.product_id = p_product_id
    AND sku_stock.location_id = locations.id
    AND locations.type = 'online'
    AND sku_stock.quantity >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_discount_usage(p_discount_code_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE discount_codes
  SET times_used = times_used + 1
  WHERE id = p_discount_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

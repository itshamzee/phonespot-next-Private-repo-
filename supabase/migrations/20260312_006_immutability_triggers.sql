-- 20260312_006_immutability_triggers.sql
-- Prevent modification of finalized orders and activity log
-- Required by Bogføringsloven

CREATE OR REPLACE FUNCTION prevent_order_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('confirmed', 'shipped', 'picked_up', 'delivered') THEN
    IF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
      IF (OLD.status = 'confirmed' AND NEW.status IN ('shipped', 'picked_up', 'cancelled')) OR
         (OLD.status = 'shipped' AND NEW.status IN ('delivered', 'refunded')) OR
         (OLD.status = 'picked_up' AND NEW.status IN ('delivered', 'refunded')) OR
         (OLD.status = 'delivered' AND NEW.status = 'refunded') THEN
        RETURN NEW;
      END IF;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.tracking_number IS DISTINCT FROM OLD.tracking_number THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cannot modify finalized order %. Use a correction/refund entry instead.', OLD.order_number;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_immutability
  BEFORE UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_order_modification();

CREATE OR REPLACE FUNCTION prevent_order_items_modification()
RETURNS TRIGGER AS $$
DECLARE
  order_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO order_status FROM orders WHERE id = OLD.order_id;
  ELSE
    SELECT status INTO order_status FROM orders WHERE id = NEW.order_id;
  END IF;

  IF order_status IN ('confirmed', 'shipped', 'picked_up', 'delivered') THEN
    RAISE EXCEPTION 'Cannot modify items on a finalized order. Use a correction/refund entry instead.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_items_immutability
  BEFORE UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_order_items_modification();

CREATE OR REPLACE FUNCTION prevent_activity_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Activity log is append-only. Cannot update or delete entries.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_activity_log_immutable
  BEFORE UPDATE OR DELETE ON activity_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_activity_log_modification();

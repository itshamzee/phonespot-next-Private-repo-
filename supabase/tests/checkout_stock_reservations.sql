-- Run after fixture + unchanged production migration, with ON_ERROR_STOP.
DO $$
DECLARE a text := repeat('a',64); b text := repeat('b',64); g uuid; expiry timestamptz; r jsonb;
BEGIN
  r := public.reserve_cart_device(test.id(201),a);
  PERFORM test.assert((r->>'reserved')::boolean,'first reservation');
  SELECT reservation_id,reservation_expires_at INTO g,expiry FROM public.devices WHERE id=test.id(201);
  PERFORM public.reserve_cart_device(test.id(201),a);
  PERFORM test.assert((SELECT reservation_id=g AND reservation_expires_at=expiry FROM public.devices WHERE id=test.id(201)),'idempotent hold does not extend');
  PERFORM test.assert(NOT (public.reserve_cart_device(test.id(201),b)->>'reserved')::boolean,'foreign reserve denied');
  PERFORM test.assert(NOT (public.release_cart_device(test.id(201),b)->>'released')::boolean,'foreign release denied');
  PERFORM test.new_order(301);
  UPDATE public.devices SET reservation_expires_at=clock_timestamp()-interval '1 second' WHERE id=test.id(201);
  PERFORM public.reserve_cart_device(test.id(201),b);
  BEGIN
    PERFORM public.attach_checkout_order_items(test.id(301),a,jsonb_build_array(jsonb_build_object('item_type','device','device_id',test.id(201),'reservation_id',g,'quantity',1,'unit_price',30000,'total_price',30000)));
    RAISE EXCEPTION 'Expected stale attach to fail';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Checkout reservation conflict' THEN RAISE; END IF;
  END;
  PERFORM test.assert(NOT EXISTS(SELECT 1 FROM public.order_items WHERE order_id=test.id(301)),'stale attach inserts no items');
  PERFORM test.assert(NOT(public.release_cart_device(test.id(201),a)->>'released')::boolean,'stale owner cannot release new generation');
  INSERT INTO public.order_items(order_id,item_type,device_id,reservation_id,quantity,unit_price,total_price)
    VALUES(test.id(301),'device',test.id(201),g,1,30000,30000);
  PERFORM test.assert(public.complete_checkout_order(test.id(301),'cs_301','pi')->>'status'='stock_failed','stale completion fails');
  PERFORM test.assert(public.expire_checkout_order(test.id(301),'cs_301')->>'status'='ignored','paid failed is never expired');
  PERFORM test.assert((SELECT reservation_owner_hash=b AND status='reserved' FROM public.devices WHERE id=test.id(201)),'new owner survives old completion');
  UPDATE public.devices SET reservation_expires_at=NULL WHERE id=test.id(202);
  UPDATE public.devices SET status='reserved' WHERE id=test.id(202);
  PERFORM test.assert(NOT(public.reserve_cart_device(test.id(202),a)->>'reserved')::boolean,'null expiry fails closed');
END $$;

-- An unpaid old order can expire without touching a replacement generation.
SELECT test.new_order(306);
INSERT INTO public.order_items(order_id,item_type,device_id,reservation_id,quantity,unit_price,total_price)
 VALUES(test.id(306),'device',test.id(201),gen_random_uuid(),1,30000,30000);
SELECT test.assert(public.expire_checkout_order(test.id(306),'cs_306')->>'status'='expired','stale generation expiry');
SELECT test.assert((SELECT status='reserved' AND reservation_owner_hash=repeat('b',64) FROM public.devices WHERE id=test.id(201)),'expiry leaves newer browser reservation');

-- Attach rolls back an earlier successful binding if a later device conflicts.
SELECT test.new_order(307);
SELECT public.reserve_cart_device(test.id(206),repeat('a',64));
SELECT public.reserve_cart_device(test.id(207),repeat('b',64));
DO $$ BEGIN
 BEGIN
  PERFORM public.attach_checkout_order_items(test.id(307),repeat('a',64),
   (SELECT jsonb_agg(jsonb_build_object('item_type','device','device_id',id,'reservation_id',reservation_id,'quantity',1,'unit_price',30000,'total_price',30000))
    FROM public.devices WHERE id IN(test.id(206),test.id(207))));
  RAISE EXCEPTION 'Expected attach failure';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Checkout reservation conflict' THEN RAISE; END IF; END;
 PERFORM test.assert((SELECT reservation_order_id IS NULL FROM public.devices WHERE id=test.id(206)),'first binding rolled back');
 PERFORM test.assert(NOT EXISTS(SELECT 1 FROM public.order_items WHERE order_id=test.id(307)),'all inserts rolled back');
END $$;

-- Partial failure rolls back previously deducted SKU and device/backfill writes.
SELECT test.new_order(302);
INSERT INTO public.sku_stock(product_id,location_id,quantity) VALUES(test.id(101),test.id(1),1),(test.id(102),test.id(1),0);
INSERT INTO public.order_items(order_id,item_type,sku_product_id,quantity,unit_price,total_price)
 VALUES(test.id(302),'sku_product',test.id(101),1,100,100),(test.id(302),'sku_product',test.id(102),1,100,100);
SELECT test.assert(public.complete_checkout_order(test.id(302),'cs_302','pi')->>'status'='stock_failed','partial stock failure');
SELECT test.assert((SELECT quantity=1 FROM public.sku_stock WHERE product_id=test.id(101)),'first SKU rolled back');
SELECT test.assert((SELECT status='pending' AND payment_status='paid' AND stock_failure_code='insufficient_stock' FROM public.orders WHERE id=test.id(302)),'failure persisted');
UPDATE public.sku_stock SET quantity=1 WHERE product_id=test.id(102);
SELECT test.assert(public.complete_checkout_order(test.id(302),'cs_302','pi')->>'status'='completed','restock retry completes');
SELECT test.assert(public.complete_checkout_order(test.id(302),'cs_302','pi')->>'status'='already_completed','commit then network retry');
SELECT test.assert((SELECT sum(quantity)=0 FROM public.sku_stock WHERE product_id IN(test.id(101),test.id(102))),'deducted exactly once');

-- Multiple locations and variant lines; unlimited SKUs are never deducted.
SELECT test.new_order(303);
INSERT INTO public.sku_stock(product_id,location_id,quantity) VALUES
 (test.id(103),test.id(1),1),(test.id(103),test.id(5),1),(test.id(103),test.id(2),2),(test.id(103),test.id(3),2),(test.id(104),test.id(1),5);
UPDATE public.sku_products SET always_in_stock=true WHERE id=test.id(104);
INSERT INTO public.order_items(order_id,item_type,sku_product_id,quantity,unit_price,total_price) VALUES
 (test.id(303),'sku_product',test.id(103),1,100,100),(test.id(303),'sku_product',test.id(103),2,100,200),(test.id(303),'sku_product',test.id(104),20,100,2000);
SELECT test.assert(public.complete_checkout_order(test.id(303),'cs_303','pi')->>'status'='completed','split location completion');
SELECT test.assert((SELECT sum(quantity)=3 FROM public.sku_stock WHERE product_id=test.id(103)),'exact total allocation');
SELECT test.assert((SELECT quantity=1 FROM public.sku_stock WHERE product_id=test.id(103) AND location_id=test.id(2)),'online before warehouse');
SELECT test.assert((SELECT quantity=2 FROM public.sku_stock WHERE product_id=test.id(103) AND location_id=test.id(3)),'store last');
SELECT test.assert((SELECT quantity=5 FROM public.sku_stock WHERE product_id=test.id(104)),'unlimited unchanged');

-- Force a genuine infrastructure error at finalization: transaction must roll back.
SELECT test.new_order(304);
SELECT public.reserve_cart_device(test.id(203),repeat('a',64));
SELECT public.attach_checkout_order_items(test.id(304),repeat('a',64),jsonb_build_array(
 jsonb_build_object('item_type','device','device_id',test.id(203),'reservation_id',(SELECT reservation_id FROM public.devices WHERE id=test.id(203)),
 'quantity',1,'unit_price',33000,'total_price',33000,'upgrade_details',jsonb_build_array(jsonb_build_object('price_oere',3000))),
 jsonb_build_object('item_type','sku_product','sku_product_id',test.id(105),'quantity',1,'unit_price',100,'total_price',100)));
SELECT test.assert(NOT(public.release_cart_device(test.id(203),repeat('a',64))->>'released')::boolean,'clearCart cannot release checkout-bound hold');
INSERT INTO public.sku_stock VALUES(test.id(105),test.id(1),1,0,NULL,now());
CREATE FUNCTION test.fail_confirm() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id=test.id(304) AND NEW.status='confirmed' THEN RAISE EXCEPTION 'forced finalization failure'; END IF; RETURN NEW; END $$;
CREATE TRIGGER test_fail BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION test.fail_confirm();
DO $$ BEGIN
 BEGIN PERFORM public.complete_checkout_order(test.id(304),'cs_304','pi'); RAISE EXCEPTION 'Expected failure';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'forced finalization failure' THEN RAISE; END IF; END;
 PERFORM test.assert((SELECT quantity=1 FROM public.sku_stock WHERE product_id=test.id(105)),'forced error rolls back SKU');
 PERFORM test.assert((SELECT status='reserved' FROM public.devices WHERE id=test.id(203)),'forced error rolls back sold device');
 PERFORM test.assert((SELECT purchase_price IS NULL FROM public.order_items WHERE order_id=test.id(304) AND item_type='device'),'forced error rolls back backfill');
END $$;
DROP TRIGGER test_fail ON public.orders;
SELECT test.assert(public.complete_checkout_order(test.id(304),'cs_304','pi',ARRAY[(SELECT id FROM public.order_items WHERE order_id=test.id(304) AND item_type='device')])->>'status'='completed','backfill before immutable confirmation');
SELECT test.assert((SELECT brugtmoms_total=5000 FROM public.orders WHERE id=test.id(304)),'VAT excludes upgrade price');
SELECT test.assert((SELECT purchase_price=10000 AND vat_scheme='brugtmoms' AND battery_upgrade FROM public.order_items WHERE order_id=test.id(304) AND item_type='device'),'line snapshot and battery persisted');
SELECT test.assert((SELECT reservation_id IS NULL AND reservation_order_id IS NULL AND reservation_owner_hash IS NULL AND reservation_expires_at IS NULL FROM public.devices WHERE id=test.id(203)),'status trigger clears identity');
DO $$ BEGIN
 BEGIN UPDATE public.order_items SET purchase_price=1 WHERE order_id=test.id(304); RAISE EXCEPTION 'Expected immutable failure';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Cannot modify items on a finalized order%' THEN RAISE; END IF; END;
END $$;

-- Expiry and recovery retain supplier idempotency without redefining supplier RPCs.
SELECT test.new_order(305);
UPDATE public.devices SET source='foxway',source_stock=1 WHERE id=test.id(204);
INSERT INTO public.order_items(order_id,item_type,device_id,quantity,unit_price,total_price)
 VALUES(test.id(305),'device',test.id(204),1,30000,30000),(test.id(305),'device',test.id(205),1,30000,30000);
SELECT test.assert(public.expire_checkout_order(test.id(305),'cs_305')->>'status'='expired','expiry wins');
SELECT public.expire_checkout_order(test.id(305),'cs_305');
SELECT test.assert((SELECT source_stock=2 FROM public.devices WHERE id=test.id(204)),'expiry restores once');
SELECT test.assert(public.reserve_recovery_order(test.id(305),'wrong')->>'status'='unavailable','token checked');
UPDATE public.devices SET status='sold' WHERE id=test.id(205);
SELECT test.assert(public.reserve_recovery_order(test.id(305),(SELECT recovery_token FROM public.orders WHERE id=test.id(305)))->>'status'='unavailable','recovery fails atomically');
SELECT test.assert((SELECT source_stock=2 FROM public.devices WHERE id=test.id(204)),'partial recovery supplier decrement rolled back');
UPDATE public.devices SET status='listed' WHERE id=test.id(205);
SELECT test.assert(public.reserve_recovery_order(test.id(305),(SELECT recovery_token FROM public.orders WHERE id=test.id(305)))->>'status'='reserved','recovery succeeds');
CREATE TEMP TABLE recovery_snapshot AS SELECT reservation_id,reservation_expires_at FROM public.devices WHERE id=test.id(205);
SELECT public.reserve_recovery_order(test.id(305),(SELECT recovery_token FROM public.orders WHERE id=test.id(305)));
SELECT test.assert((SELECT source_stock=1 FROM public.devices WHERE id=test.id(204)),'recovery deducts once');
SELECT test.assert((SELECT d.reservation_id=s.reservation_id AND d.reservation_expires_at=s.reservation_expires_at FROM public.devices d CROSS JOIN recovery_snapshot s WHERE d.id=test.id(205)),'recovery retry reuses hold');
UPDATE public.orders SET status='pending',stripe_checkout_session_id='cs_recovery' WHERE id=test.id(305);
SELECT test.assert(public.expire_checkout_order(test.id(305),'cs_305')->>'status'='ignored','stale session expiry ignored');
SELECT test.assert((SELECT source_stock=1 FROM public.devices WHERE id=test.id(204)),'stale expiry no supplier increment');
SELECT test.assert(public.complete_checkout_order(test.id(305),'cs_recovery','pi')->>'status'='completed','recovered completion');
SELECT test.assert((SELECT source_stock=1 FROM public.devices WHERE id=test.id(204)),'completion no second supplier decrement');

-- SQL aggregation covers >1000 rows, including later store inventory.
INSERT INTO public.locations(id,name,type) SELECT test.id(10000+n),'Location '||n,CASE WHEN n=1101 THEN 'store' ELSE 'online' END FROM generate_series(1,1101)n;
INSERT INTO public.sku_stock(product_id,location_id,quantity) SELECT test.id(106),test.id(10000+n),1 FROM generate_series(1,1101)n;
SELECT test.assert((SELECT total_stock=1101 AND store_stock=1 AND online_stock=1100 FROM public.checkout_sku_inventory WHERE id=test.id(106) AND store_stock>0),'complete SQL inventory aggregation');

DO $$ DECLARE f record; role_name text; BEGIN
 FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN
 ('reserve_cart_device','release_cart_device','attach_checkout_order_items','complete_checkout_order','expire_checkout_order','reserve_recovery_order') LOOP
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
   PERFORM test.assert(NOT has_function_privilege(role_name,f.oid,'EXECUTE'),'RPC denied '||role_name);
  END LOOP;
  PERFORM test.assert(has_function_privilege('service_role',f.oid,'EXECUTE'),'service RPC allowed');
 END LOOP;
 PERFORM test.assert(NOT has_table_privilege('anon','public.checkout_sku_inventory','SELECT'),'anon view denied');
 PERFORM test.assert(NOT has_table_privilege('authenticated','public.checkout_sku_inventory','SELECT'),'authenticated view denied');
 PERFORM test.assert(has_table_privilege('service_role','public.checkout_sku_inventory','SELECT'),'service view allowed');
 PERFORM test.assert(NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='checkout_sku_inventory' AND column_name IN('cost_price','supplier_id','reservation_owner_hash')),'view excludes private columns');
END $$;
SELECT 'checkout SQL assertions passed' AS result;

-- Isolated test database only. Base table definitions and immutability triggers
-- are loaded directly from their source migrations; no catalog/customer seed.
\ir ../migrations/20260312_001_core_schema.sql
\ir ../migrations/20260312_002_commerce_schema.sql
CREATE TABLE public.activity_log(id uuid PRIMARY KEY);
\ir ../migrations/20260312_006_immutability_triggers.sql
ALTER TABLE public.devices ADD COLUMN source text NOT NULL DEFAULT 'internal', ADD COLUMN source_stock integer DEFAULT 0;
ALTER TABLE public.devices DROP CONSTRAINT devices_status_check;
ALTER TABLE public.devices ADD CHECK(status IN ('intake','graded','listed','reserved','sold','shipped','picked_up','returned','delisted'));
ALTER TABLE public.sku_products ADD COLUMN slug text, ADD COLUMN status text DEFAULT 'published',
 ADD COLUMN compatible_models jsonb DEFAULT '[]', ADD COLUMN attributes jsonb DEFAULT '{}',
 ADD COLUMN variant_label text, ADD COLUMN always_in_stock boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CHECK(status IN ('pending','confirmed','shipped','picked_up','delivered','cancelled','refunded','abandoned'));
ALTER TABLE public.orders ADD COLUMN payment_status text DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','refunded','partially_refunded')),
 ADD COLUMN abandoned_at timestamptz, ADD COLUMN recovery_token text, ADD COLUMN recovery_status text DEFAULT 'none',
 ADD COLUMN foxway_status text CHECK(foxway_status IN ('pending','ordered')), ADD COLUMN foxway_order_ref text;
ALTER TABLE public.order_items ADD COLUMN upgrade_details jsonb, ADD COLUMN battery_upgrade boolean NOT NULL DEFAULT false;
CREATE SCHEMA test;
CREATE FUNCTION test.id(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$ SELECT lpad(n::text,32,'0')::uuid $$;
CREATE FUNCTION test.assert(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'ASSERTION: %', message; END IF; END $$;
CREATE FUNCTION test.new_order(n integer) RETURNS uuid LANGUAGE plpgsql AS $$
BEGIN INSERT INTO public.orders(id,order_number,type,stripe_checkout_session_id) VALUES(test.id(n),'TEST-'||n,'online','cs_'||n); RETURN test.id(n); END $$;
INSERT INTO public.locations(id,name,type) VALUES
 (test.id(1),'Online A','online'),(test.id(2),'Warehouse','warehouse'),(test.id(3),'Store A','store'),
 (test.id(4),'Store B','store'),(test.id(5),'Online B','online');
INSERT INTO public.product_templates(id,brand,model,category,display_name,slug) VALUES(test.id(10),'Test','Test','iphone','Test','fixture');
INSERT INTO public.sku_products(id,title,selling_price,category) SELECT test.id(n),'SKU '||n,100,'accessory' FROM generate_series(101,120)n;
INSERT INTO public.devices(id,template_id,grade,purchase_price,selling_price,location_id,status)
 SELECT test.id(n),test.id(10),'A',10000,30000,test.id(3),'listed' FROM generate_series(201,220)n;

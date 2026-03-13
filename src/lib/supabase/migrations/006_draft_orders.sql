-- 006_draft_orders.sql
-- Creates draft_orders table and adds draft_order_id to repair_tickets

CREATE TABLE IF NOT EXISTS draft_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  customer_email text,
  customer_name text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'converting', 'cancelled')),
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal integer NOT NULL DEFAULT 0,
  discount_amount integer DEFAULT 0,
  shipping_cost integer DEFAULT 0,
  tax_amount integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  currency text DEFAULT 'DKK',
  internal_note text,
  customer_note text,
  payment_url text,
  stripe_session_id text,
  paid_at timestamptz,
  converted_order_id uuid REFERENCES orders(id),
  repair_ticket_id uuid REFERENCES repair_tickets(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_draft_orders_status ON draft_orders(status);
CREATE INDEX IF NOT EXISTS idx_draft_orders_customer ON draft_orders(customer_id);

-- Add draft_order_id to repair_tickets
ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS draft_order_id uuid REFERENCES draft_orders(id);

-- Sequence for draft numbers
CREATE SEQUENCE IF NOT EXISTS draft_order_number_seq START WITH 1001;

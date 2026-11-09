-- D2: slutsedler læses kun via serveren (/api/trade-in/receipts), aldrig direkte
-- fra browseren. Kør først, når de admin-sider, der læste tabellerne fra
-- browser-klienten, er udrullet (opkoeb, opkoeb/ko, opkoeb/[id], opkoeb/[id]/slutseddel).
-- Service-rollen og SECURITY DEFINER-funktionerne påvirkes ikke.

REVOKE SELECT ON public.trade_in_receipts, public.trade_in_receipt_items FROM anon, authenticated;

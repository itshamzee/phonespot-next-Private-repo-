# Checkout stock transactions

The checkout routes depend on `20260916180000_checkout_stock_reservations.sql`.
Apply that migration through the normal reviewed deployment process before
deploying the corresponding application. This change does not apply it to any
shared database automatically.

The migration adds browser-owned device reservations, order-bound reservation
generations, a public-field inventory view restricted to `service_role`, and
checkout-specific transaction functions. Existing POS, draft-order and supplier
stock functions are not replaced.

## Before rollout

- Confirm the deployed schema matches the referenced source migrations and that
  the new view/functions are restricted to `service_role`.
- Plan for existing carts and pending device orders. Old reservations have no
  owner/generation and are deliberately not assigned fabricated ownership.
  Customers can reserve again after the original hold expires. Old paid/pending
  device orders without a generation require manual reconciliation; they cannot
  sell a newer reservation. Historical finalized orders are never deducted again.
- Drain or explicitly reconcile pending sessions before switching webhook
  implementations. Do not run the old nontransactional webhook and the new one
  concurrently during rollout.
- Verify public and admin flows in an isolated environment with the migration,
  including the actual PostgREST view query, before approving production rollout.

## Payment received but stock unavailable

`complete_checkout_order` leaves the order `pending` with
`payment_status = 'paid'`, `stock_failure_code` and `stock_failure_at` when stock
or reservation identity cannot be committed. The webhook returns an error so
Stripe retries. No success email, warranty or staff success notification is sent.

Review these orders operationally. Resolve inventory/reservation conflicts before
retrying, or use the established refund process. The change does not implement
automatic refunds or a new staffed alert channel. An expiry event cannot abandon
a paid stock-failure order.

Successful completion commits every stock change, device sale, purchase/VAT
snapshot, battery flag and order confirmation together. Retries return without
another deduction. External notifications remain outside the transaction and can
still be missed if the process stops after the database commit.

## Boundaries

- SKU availability is aggregated across variant lines, but SKU stock is not held
  before payment. Two separate paid checkouts can still compete for the last
  unit; one may require the paid-stock-failure handling above.
- Cart device holds last 15 minutes. Binding to an order gives 35 minutes for a
  30-minute checkout. Late payments after expiry fail closed.
- Recovery uses the existing Stripe session creation and parameters. Supplier
  line markers prevent repeated recovery calls from deducting twice; a failed
  Stripe creation still has no new compensation system. Concurrent recovery
  requests can still create competing Stripe sessions; only the session saved
  on the order can complete. Monitor/reconcile late payment events accordingly.
- The store filter operates on complete SQL stock totals before the API limit.
  The separate model-compatibility ID query retains its existing scale limit.
  This code change alone does not establish the cause of any production HTTP 500.

## Local verification

Use an isolated PostgreSQL cluster and a test-only `phonespot_test` user capable
of creating a disposable database and test roles. Never point this runner at a
shared database. It requires explicit loopback port and executable arguments:

```text
node supabase/tests/run-checkout-stock.mjs <absolute-psql-path> <isolated-port>
```

The runner reads base schema and immutability triggers from repository sources,
adds minimal later columns, loads the existing supplier function definitions,
applies the production migration unchanged, and runs SQL assertions plus five
controlled two-connection races. It verifies actual lock blocking before commit.
The disposable database remains for inspection; stop/remove the isolated cluster
after review. It does not exercise PostgREST HTTP behavior or live data.

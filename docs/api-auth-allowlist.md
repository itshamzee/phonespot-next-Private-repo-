# API auth remediation — route inventory, allowlist and denylist

Status: Step 1 of 4 (inventory). No behaviour change in this commit.

Context: every route under `src/app/api/platform/**` and `src/app/api/admin/**` uses
`createServerClient()` (`src/lib/supabase/client.ts:13`), which is a **service-role**
Supabase client and bypasses RLS. Before this remediation only 5 of 71 route files
checked anything. There is no `middleware.ts`, no Vercel deployment protection, and
the `(admin)` layout gates UI pages client-side only.

The fix is a `middleware.ts` that gates the two prefixes on a **staff** session,
accepting either a cookie session (`@supabase/ssr`) or the existing
`Authorization: Bearer` header that `staffFetch()` sends.

---

## 1. Gated prefixes (middleware matcher)

```
/api/admin/:path*
/api/platform/:path*
```

Everything under these two prefixes is denied unless the caller is staff, **except**
the allowlist in section 2.

Deliberately **not** in the matcher — these keep their own authentication and must not
be touched:

| Route | Own auth |
|---|---|
| `POST /api/webhook/stripe` | Stripe signature (`stripe.webhooks.constructEvent`) — **must stay untouched** |
| `POST /api/webhooks/shipmondo` | shared-secret / signature check |
| `POST /api/webhooks/resend-inbound` | Svix signature |
| `POST /api/webhooks/shopify` | HMAC |
| `GET /api/feeds/partner` | `PARTNER_FEED_TOKEN` |
| `/api/cron/*`, `GET /api/seo/sync` | `CRON_SECRET` bearer |
| `/api/customers*`, `/api/trade-in/*` (staff subset) | `requireStaff()` in-route |
| `/api/dashboard`, `/api/pos/*`, `/api/refund`, `/api/labels`, `/api/warranty/generate`, `/api/warranty/send`, `/api/gdpr/*`, `/api/export/transactions`, `/api/orders/recent`, `/api/discount-codes`, `/api/accounting/saft`, `/api/b2b`, `/api/customer`, `/api/reklamation`, `/api/dashboard/ga4` | in-route bearer + `staff` lookup |

### Cron cross-check

`vercel.json` declares five crons:

```
/api/seo/sync                     0 4 * * *
/api/cron/release-reservations    0 3 * * *
/api/cron/recovery                0 5 * * *
/api/cron/foneday-sync            0 6 * * *
/api/cron/buyback-digest          0 7 * * *
```

**None of them is under `/api/admin` or `/api/platform`.** No cron needs allowlisting.
(`/api/cron/low-stock` exists as a route but is not scheduled in `vercel.json`.)

---

## 2. Allowlist — inside the gated prefixes, but public by design

Determined by grepping every `fetch("/api/admin/…")` / `fetch("/api/platform/…")` call
site outside `src/app/(admin)/**`, `src/components/admin/**` and
`src/components/platform/**`. Exactly one storefront component hits the gated prefixes:

| Method + path | Called by | Why it must stay public |
|---|---|---|
| `GET /api/admin/spare-parts/categories` | `src/components/spare-parts/spare-parts-filters.tsx:257` | Renders the filter sidebar on the public `/reservedele*` pages |
| `GET /api/admin/spare-parts/quality-tiers` | `src/components/spare-parts/spare-parts-filters.tsx:258` | Same sidebar (quality-tier chips) |

Both are read-only listings of catalogue metadata (name, slug, SEO copy, badge
colours, warranty months). No PII, no cost prices. **`POST` on the same two paths
stays gated** — the allowlist is method-scoped, not path-scoped.

Everything else under the two prefixes is admin-only: verified that no file under
`src/app/**` outside `src/app/(admin)/**` imports `src/components/platform/**` or
`src/components/admin/**`.

---

## 3. Denylist — the 69 route files that get gated

### `src/app/api/platform/**` (28 files)

| Route | Methods | Auth before |
|---|---|---|
| `platform/activity-log` | GET | inline bearer (already OK) |
| `platform/afregningsbilag` | POST | none |
| `platform/categories` | GET POST PATCH DELETE | none |
| `platform/devices` | GET POST | `requireStaff` on POST only |
| `platform/devices/[id]` | GET PATCH DELETE | none |
| `platform/devices/import` | POST | none |
| `platform/devices/quick-add` | POST | `requireStaff` |
| `platform/devices/upload-photos` | POST | none |
| `platform/draft-orders` | GET POST | none |
| `platform/draft-orders/[id]` | GET PUT DELETE | none |
| `platform/draft-orders/[id]/mark-paid` | POST | none |
| `platform/draft-orders/[id]/send` | POST | none |
| `platform/images/[key]` | DELETE | none |
| `platform/images/library` | GET | none |
| `platform/images/upload` | POST | none |
| `platform/locations` | GET | none |
| `platform/sku` | GET POST PATCH DELETE | none |
| `platform/sku/[id]` | GET PUT PATCH DELETE | none |
| `platform/sku/brands` | GET | none |
| `platform/sku/compatible-models` | GET | none |
| `platform/sku-product-templates` | GET POST DELETE | none |
| `platform/sku-stock` | GET PATCH | none |
| `platform/stock-summary` | GET | none |
| `platform/suppliers` | GET POST | none |
| `platform/templates` | GET POST PATCH DELETE | none |
| `platform/templates/[id]` | GET PUT DELETE | none |
| `platform/transfers` | GET POST | none |
| `platform/valuation` | GET | none |

### `src/app/api/admin/**` (43 files)

| Route | Methods | Auth before |
|---|---|---|
| `admin/accessories` | GET POST | none |
| `admin/accessories/[id]` | PUT DELETE | none |
| `admin/accessories/bulk` | POST | none |
| `admin/accessories/ean-lookup` | GET | none |
| `admin/accessories/generate-ean` | POST | none |
| `admin/accessories/templates` | GET POST DELETE | none |
| `admin/ai-reply` | POST | none — unmetered OpenAI spend |
| `admin/b2b` | GET | none — **B2B PII incl. CVR** |
| `admin/b2b/[id]` | PATCH | none |
| `admin/brands` | GET POST | none |
| `admin/brands/[id]` | PATCH DELETE | none |
| `admin/buyback/preflight` | POST | `requireStaff` |
| `admin/buyback/settings` | GET PATCH | `requireStaff` |
| `admin/foneday/catalog` | GET | none |
| `admin/foneday/link` | POST DELETE | none |
| `admin/foneday/link/bulk` | POST | none |
| `admin/foneday/mappings` | GET PUT | none |
| `admin/foneday/settings` | GET PUT | none |
| `admin/foneday/sync` | POST | none |
| `admin/foxway/import` | POST GET | none |
| `admin/models` | GET POST | none |
| `admin/models/[id]` | PATCH DELETE | none |
| `admin/products/create` | POST | none |
| `admin/profile` | GET PUT | inline bearer (already OK) |
| `admin/reservations` | GET | none |
| `admin/reservations/[id]` | PUT | none |
| `admin/search` | GET | none |
| `admin/services` | GET POST | none |
| `admin/services/[id]` | PATCH DELETE | none |
| `admin/settings/company` | GET PUT | inline bearer (already OK) |
| `admin/spare-parts` | GET POST | none |
| `admin/spare-parts/[id]` | GET PATCH DELETE | none |
| `admin/spare-parts/categories` | GET POST | none — **GET allowlisted** |
| `admin/spare-parts/categories/[id]` | PATCH DELETE | none |
| `admin/spare-parts/quality-tiers` | GET POST | none — **GET allowlisted** |
| `admin/spare-parts/quality-tiers/[id]` | PATCH DELETE | none |
| `admin/spot` | POST | none |
| `admin/spot/[id]` | PATCH DELETE | none |
| `admin/spot/data` | GET | none |
| `admin/status` | GET | none — leaks which env secrets are configured |
| `admin/templates` | GET POST | none |
| `admin/templates/[id]` | PATCH DELETE | none |
| `admin/test-emails` | POST | none — open mail relay |

---

## 4. Staff definition

One definition only, reused: a row in the `staff` table whose `auth_id` equals the
authenticated Supabase user's id — exactly what `requireStaff()`
(`src/lib/auth/require-staff.ts`) already looks up. The middleware calls the same
helper. `resolveStaff()` (`src/lib/auth/resolve-staff.ts`, used only by
`/api/dashboard`) additionally auto-provisions an owner row for
`@phonespot.dk` / whitelisted e-mails; the middleware does **not** auto-provision —
it only reads.

If the staff lookup errors, the middleware denies (fail closed).

---

## 5. Known consequence

Moving the admin session from `localStorage` to cookies logs every currently
signed-in staff member out once. They log back in on the normal `/admin` login
screen; no data is affected.

# Reservedele B2B + Tilbehoer Page

**Status:** Planned — not yet designed or implemented.

---

## 1. Reservedele → B2B Only

**Current state:** Public page at `/reservedele` with categories (iPhone, iPad, MacBook, Samsung) showing spare parts with prices. Anyone can browse and buy.

**Goal:** Lock the reservedele page behind B2B authentication. Only admin-approved business accounts can access prices and order.

### Requirements

- **Admin-approved accounts:** B2B customer registers, admin approves in the admin panel before they can access
- **Individual pricing:** Different prices per B2B customer/company (not one flat B2B price list)
- **Login required:** Unauthenticated visitors see a "B2B kun — log ind eller anmod om adgang" page
- **Admin panel:** Manage B2B accounts (approve/reject, set individual price lists)

### Approach options (to explore during design)

1. **Supabase auth + custom price lists** — B2B accounts in Supabase with per-customer price overrides. Admin panel manages accounts and prices.
2. **Shopify B2B** — Use Shopify's native B2B features (company accounts, catalogs, price lists). More complex but integrates with Shopify checkout.
3. **Hybrid** — Supabase for auth/approval, Shopify for pricing via metafields or tags.

### Open questions

- Should B2B orders go through Shopify checkout or a separate invoicing flow?
- Do B2B customers pay online or on invoice (faktura)?
- Should there be a B2B application form on the public site?

---

## 2. Tilbehoer → New Consumer Page

**Current state:** No tilbehoer page exists yet.

**Goal:** Create a public-facing accessories page at `/tilbehoer` for B2C customers.

### Product categories

- **Covers & cases** — phone covers, tablet covers
- **Skaermbeskyttelse** — panserglas, screen protectors
- **Kabler & opladere** — Lightning, USB-C, tradlos oplader
- **Andet tilbehoer** — horetelefoner, popsockets, bilholdere etc.

### Product data

- Mix of existing Shopify products and new ones that need to be created
- Products should be tagged/categorized in Shopify for filtering

### Design inspiration

Look at competitors and accessory shops for layout:
- Organized by category with filtering
- Device compatibility filters (e.g. "iPhone 16 Pro Max covers")
- Grid layout with product cards
- Integration with existing Shopify cart/checkout flow

### Approach

- Create Shopify collections for each accessory category
- Build `/tilbehoer` page with category grid + product listings
- Reuse existing Shopify Storefront API client and cart system
- Same design language as the rest of phonespot.dk

---

## When ready

Use the brainstorming skill to fully design each feature before implementation. These can be done independently — tilbehoer is simpler (new page with Shopify products), reservedele B2B is more complex (auth + individual pricing).

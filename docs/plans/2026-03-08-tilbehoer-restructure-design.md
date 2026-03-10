# Tilbehoer Page Restructure Design

**Goal:** Redesign /tilbehoer to handle 1000+ products with proper categorization, device-based navigation, filtering, and pagination.

**Architecture:** Nested static routes mapping to Shopify collections, with server-side filtering via query params. A central config map drives all routing, metadata, and data fetching.

**Tech Stack:** Next.js App Router (SSG + searchParams), Shopify Storefront API (collections + cursor pagination), Tailwind CSS v4.

---

## URL Structure

```
/tilbehoer                              -> Landing page
/tilbehoer/[category]                   -> Category page (e.g. /tilbehoer/covers)
/tilbehoer/[category]/[device]          -> Device-specific (e.g. /tilbehoer/covers/iphone-16-pro)
/tilbehoer/outlet                       -> Clearance/sale section
```

Query params for filters:
```
?pris=0-199&brand=spigen&sort=price-asc&side=2
```

### Categories

| Slug | Title | Notes |
|------|-------|-------|
| covers | Covers & Cases | Largest category (1000+) |
| skaermbeskyttelse | Skaermbeskyttelse | Panserglas, screen protectors |
| opladere | Kabler & Opladere | Lightning, USB-C, traadloes |
| lyd | Lyd & Hoeretelefoner | Earbuds, headsets |
| outlet | Outlet | Discounted/clearance accessories |

### Devices (examples)

Apple: iphone-16-pro-max, iphone-16-pro, iphone-16, iphone-15-pro-max, iphone-15-pro, iphone-15, iphone-14, iphone-13, ipad-pro-13, ipad-air-m2, etc.

Samsung: samsung-s24-ultra, samsung-s24, samsung-s23, samsung-a55, etc.

---

## Config Map

Single source of truth in `src/lib/tilbehoer-config.ts`:

```ts
interface TilbehoerRoute {
  category: string;          // "covers"
  device?: string;           // "iphone-16-pro"
  shopifyHandle: string;     // "iphone-16-pro-covers"
  deviceLabel?: string;      // "iPhone 16 Pro"
  categoryLabel: string;     // "Covers & Cases"
  brand?: string;            // "apple"
}
```

This config drives:
- generateStaticParams for SSG
- Breadcrumbs and page titles
- SEO metadata per page
- Shopify collection handle lookup
- Device chip navigation

---

## Landing Page (`/tilbehoer`)

Top to bottom:

1. **Hero** — Badge, heading "Tilbehoer", subtitle. Same style as current.

2. **"Find tilbehoer til din enhed"** — Device picker
   - Brand tabs: Apple | Samsung | (expandable)
   - Grid of device cards under each tab (image + name)
   - Clicking device -> `/tilbehoer/covers/[device]` (defaults to covers)
   - Selected device also filters the category previews below

3. **Category cards** — 5 cards: Covers, Skaermbeskyttelse, Opladere, Lyd, Outlet (with sale badge)
   - Each links to `/tilbehoer/[category]`

4. **Category previews** — 4 product previews per category with "Se alle" links
   - When a device is selected above, shows only that device's products

5. **Trust bar + value props** — Same as current

---

## Category Page (`/tilbehoer/[category]`)

Handles 1000+ products with filtering and pagination.

1. **Breadcrumb**: Tilbehoer > Covers

2. **Category header**: Title, product count, description

3. **Device sub-navigation**: Horizontal scrollable chips
   - "Alle", "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16", ...
   - Clicking navigates to `/tilbehoer/[category]/[device]`
   - "Alle" stays on `/tilbehoer/[category]`

4. **Filter bar + Sort**:
   - Desktop: Sticky left sidebar (240px)
   - Mobile: "Filter" button opens slide-up drawer
   - Active filters as removable chips above grid
   - "Nulstil filtre" reset link

5. **Product grid**: 2 cols mobile, 3 md, 4 lg

6. **Pagination**: 40 products per page, "Vis flere" button, `?side=2`

---

## Device-Specific Page (`/tilbehoer/[category]/[device]`)

Same layout as category page with differences:

- Breadcrumb: Tilbehoer > Covers > iPhone 16 Pro
- Header: "iPhone 16 Pro Covers" with device-specific count
- Device chips: Current device highlighted
- Filters: Price + brand (no device filter needed)
- SEO: Unique metadata for "iPhone 16 Pro cover" searches

---

## Filters

All server-side. Shopify Storefront API does not support price filtering on collections, so:

1. Fetch all products from Shopify collection (cursor pagination, batches of 250)
2. Filter server-side by price range and vendor
3. Return paginated slice (40 per page)

### Available filters

| Filter | Type | Source | URL param |
|--------|------|--------|-----------|
| Price range | Checkbox buckets (0-99, 100-199, 200-299, 300+) | priceRange.minVariantPrice | ?pris=0-99 |
| Brand | Checkboxes | product.vendor | ?brand=spigen |
| Sort | Dropdown | Server-side sort | ?sort=price-asc |
| Page | Hidden | Pagination cursor | ?side=2 |

### Sort options

- Bestselling (default)
- Price low-high (price-asc)
- Price high-low (price-desc)
- Newest (newest)

---

## Outlet Page (`/tilbehoer/outlet`)

Same layout as category page:
- Header: "Outlet — Tilbehoer til skarpe priser" with sale badge
- Maps to Shopify collection (e.g. "tilbehoer-outlet")
- Same filters: price, brand, sort, pagination
- Products show compareAtPrice crossed out + sale price
- Optional device chips if outlet has device-specific sub-collections

---

## Filter Component Architecture

### FilterSidebar (desktop)
- Sticky sidebar, 240px wide
- Renders filter sections: PriceFilter, BrandFilter
- Reads/writes URL searchParams
- Server component reads params, client component updates them

### FilterDrawer (mobile)
- Triggered by "Filter" button
- Full-screen drawer with same filter sections
- "Vis resultater" button applies and closes

### ActiveFilters
- Horizontal row of chips above product grid
- Each chip = one active filter, click to remove
- "Nulstil" link to clear all

---

## Pagination

- 40 products per page
- "Vis flere" button loads next page
- URL param `?side=2` for bookmarkable state
- Product count: "Viser 40 af 312 produkter"
- Shopify cursor-based pagination under the hood (fetch in batches of 250, cache)

---

## SEO

Each page gets unique metadata:

- `/tilbehoer` — "Tilbehoer til iPhone, iPad & Samsung | PhoneSpot"
- `/tilbehoer/covers` — "Covers & Cases til iPhone & Samsung | PhoneSpot"
- `/tilbehoer/covers/iphone-16-pro` — "iPhone 16 Pro Covers | PhoneSpot"
- `/tilbehoer/outlet` — "Outlet — Tilbehoer til skarpe priser | PhoneSpot"

JSON-LD BreadcrumbList on every page. Product structured data on device-specific pages.

---

## File Structure

```
src/
  lib/
    tilbehoer-config.ts              # Route config map (single source of truth)
  app/
    tilbehoer/
      page.tsx                       # Landing page
      [category]/
        page.tsx                     # Category page with filters
        [device]/
          page.tsx                   # Device-specific page
  components/
    tilbehoer/
      device-picker.tsx              # Brand tabs + device grid (landing page)
      device-chips.tsx               # Horizontal scrollable device nav
      filter-sidebar.tsx             # Desktop filter sidebar
      filter-drawer.tsx              # Mobile filter drawer
      active-filters.tsx             # Filter chips above grid
      price-filter.tsx               # Price range checkboxes
      brand-filter.tsx               # Brand/vendor checkboxes
      product-count.tsx              # "Viser 40 af 312 produkter"
      load-more-button.tsx           # Pagination button
```

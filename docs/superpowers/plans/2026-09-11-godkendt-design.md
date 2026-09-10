# PhoneSpot: godkendt udtryk, én side ad gangen

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Execute page tasks sequentially, reviewing each before the next. Never merge or deploy.

**Goal:** Apply the owner's explicitly approved revision 3 to the actual customer-facing webshop, preserving working commerce and service flows.

**Architecture:** Keep Next.js App Router, existing data endpoints, cart providers and service APIs. Port the approved composition into focused React components and scoped styles; shared navigation, typography and cards carry the same expression through subsequent pages. Never ship the design-study fixture catalog as production inventory.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, existing Vitest/Testing Library, CUA browser verification.

**Spec:** `docs/ui-audit/2026-09-11/godkendt-retning.md`. Visual source: `C:/Users/Lenovo/.codex/visualizations/2026/09/10/01a08c88-ecab-77b0-ab45-8659a94bd8ef/phonespot-samlet/` (`index.html`, `design.css`, `design.js`, `desktop-v3.png`, `mobil-v3.png`).

## Global Constraints

- Main is production. Work only in `phonespot-hero` on `codex/godkendt-design`; small Danish commits and draft PRs; do not merge, deploy or push main.
- Never read `.env.local`, secrets or credentials. Do not touch database migrations, payments, shipping or admin.
- All customer-facing copy is Danish, no emojis, DM Sans sentence case for UI; Barlow Condensed only as display. Dark green `#1A3D2E`, charcoal and existing light tokens.
- Owner explicitly approved symmetry: product/category rows align in height; consistent card image bounds and CTAs. This overrides the older general asymmetry preference for these surfaces.
- 36 months warranty only on devices. Accessories: 2 years reklamationsret. Trustpilot 4,7. No banned trademark, internal supplier words, invented discounts, popularity or urgency. Insurance is Storstrøm lead flow.
- Preserve canonical metadata, existing sitemap routes and JSON-LD. No changes to URLs merely for visual design.
- Preserve real data, selections, stock checks and operational forms. No fixture products/prices in production. No global stylesheet leaking into admin or checkout.
- Preserve the approved standalone preview at port 3110. Actual app review uses a separate local server. Keep images as existing verified files or explicitly sourced external references; no fake device graphics.
- Keep task scope customer-facing UI. Cart rendering may be reviewed, but payment/checkout logic changes require separate explicit agreement.
- Test real interactions and failure modes. Do not write tests that merely assert CSS classes. Run required project build and tests before PR creation.

## Sequential roadmap

- [ ] Task 1 — Homepage plus shared navigation/footer: port revision 3, connect live catalog and existing cart/search, verify.
- [ ] Task 2 — Collection template and shared device cards: consistent image/title/spec/price hierarchy, filters and sorting preserved.
- [ ] Task 3 — Device product page: gallery, configuration, stock/price/CTA, clear condition/warranty, existing cart payload preserved.
- [ ] Task 4 — Repair landing then model/booking views: prominent device selection and store path, preserve submission and pricing.
- [ ] Task 5 — Buyback landing/steps: approved service identity, simpler visual hierarchy, preserve estimate/submit/accept/reject logic.
- [ ] Task 6 — Accessories and protection pages: same typography/cards and clear compatibility, no old homepage model-selector box, accessory-specific legal copy.
- [ ] Task 7 — Store and trust/information pages: apply shared rhythm conservatively to stores, quality, warranty, contact and FAQ, preserving authoritative content.
- [ ] Task 8 — Whole-branch integration review, mobile/desktop checks, build/tests, draft PR(s), morning handoff and list remaining pages honestly.

Each task after Task 1 gets its own detailed brief after reading that page's actual implementation. This is intentional page-by-page scoping, not permission to rewrite unrelated pages in parallel. Keep progress in `docs/ui-audit/2026-09-11/status.md` so an overnight continuation can resume safely.

### Task 1: Homepage and public shell

**Files**
- Modify `src/app/page.tsx`, `src/components/home/shop-tabs.tsx`, `src/components/layout/header.tsx`, `src/components/layout/footer.tsx`, and their relevant tests.
- Create `src/components/home/storefront-hero.tsx`, `src/components/home/storefront-sections.tsx`, `src/components/home/storefront.module.css`, `src/components/ui/storefront-icon.tsx` as needed to port the concrete approved source without global CSS collisions.
- Modify `src/lib/trustpilot/constants.ts` only for the binding 4,7 value and update affected tests, if currently wrong.
- Preserve `src/components/layout/public-shell.tsx` providers and operational overlays. Add a skip-target id if needed without nesting main elements.
- Create focused interaction tests under `src/components/home/__tests__/`.

**Consumes:** `ShopTabs` currently uses `/api/homepage-products?tab=<key>&limit=8` with `HomepageProduct` containing id/slug/title/image/minPrice/compareAtPrice/deviceCount/brand/category/inStock/href/specifications/locations. Existing `useCart()` supplies openCart and item totals. Search routes to `/soeg?q=...`.

**Produces:** Default `HomePage` with approved carousel/services/catalog/stores/quality composition; named `ShopTabs()` export preserved; named `Header()` and `Footer()` exports preserved; shared icon accepts a typed kind and optional className. Subsequent tasks reuse established styles and preserve component interfaces.

- [ ] Read the full approved HTML/CSS/JS and view desktop/mobile screenshots. Read AGENTS.md and all files being edited. Record any data integration differences.
- [ ] Write and run meaningful failing interaction tests for the new carousel (buttons, wrap and keyboard keep destination in sync), ShopTabs loading/error/retry and out-of-order category responses, and device-versus-accessory guarantee labels if accessory cards are rendered. Adapt existing header tests to the approved navigation contract, retain cart/search/menu accessibility coverage.
- [ ] Port the exact approved design rather than inventing a new variation: hero image is the verified Apple iPhone 17 Pro close-up; 4 manual categories; no autorotation; repair and buyback are persistent adjacent panels; icon category rail aligned with three product cards; authentic store photo; concise quality FAQ. Preserve Danish copy and brand proportions from the reference. Source image URLs and disclosure are in the spec/reference folder.
- [ ] Replace static fixture inventory with the existing API. Use iPhones as default, three visible products for the homepage at desktop, horizontal card rail at mobile. Categories with two products fill two equal columns. Show honest loading, empty and network-error states, with retry and a category destination. A missing image gets a neutral text fallback, not a fake marketing device. Accessories remain reachable but do not inherit device warranty.
- [ ] Ensure stale requests cannot overwrite a newer category selection. The contract is: selecting A then B must leave B active and show only B's result even if A resolves last; rejected fetch must clear loading and expose a retry action. Preserve valid hrefs and prices from API; skip invalid missing-slug items, never synthesize stock/discounts.
- [ ] Header follows approved search/category/service composition. Existing cart opens real CartDrawer through `useCart`; no design-study dialog in app. Keep mobile menu keyboard/focus handling and links, with fixed visible purchase/repair/sell entry row. No clone of a massive old mega-menu solely to satisfy stale text tests.
- [ ] Footer follows existing production footer structure/content and approved charcoal finish, DM Sans UI headings and correct rating. Preserve functional newsletter, consent management, contact links and partner/legal content; do not replace these with the standalone prototype's omissions.
- [ ] Keep canonical metadata. Remove unverified 24-hour buyback/collection promises from replaced homepage sections rather than carrying them into the new composition. Preserve relevant existing trust/review components only where consistent with the approved layout; don't reintroduce duplicate promotional sections.
- [ ] Run focused tests, typecheck and inspect errors. Commit the completed page as `feat: overfør godkendt forside og navigation til webshoppen`. Do not push until project tests/build pass and root review is complete.
- [ ] Write report with changed files, tests (commands/results), remaining concerns and commit hashes. Root reviews spec and quality, verifies desktop 1195/1440 and mobile 390/320 using CUA, and records completion before Task 2.

## Task 1 verification contracts

```tsx
// Test real state transitions, not implementation classes.
fireEvent.click(screen.getByRole('button', { name: 'Næste kategori' }));
expect(screen.getByRole('link', { name: /Se vores bærbare/i })).toHaveAttribute('href', '/baerbare');
// Assert the visible category image and heading belong to the same category.
// Mock the network boundary with deferred promises for the request-order test.
// Reject a catalog fetch; assert an alert/retry is visible and aria-busy is false.
```

Use the actual resulting accessible labels consistently in tests. Do not weaken tests to conceal missing functionality. The visual reference is the authority for composition; existing business behavior is the authority for integration.

# AI-tilbehørsoptagelse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gør `/admin/produkter/hurtig-cover` til et AI-drevet flow. Ét foto giver varetype, mærke, model(ler), farve, titel og tekst. Dubletter uden stregkode genkendes. Der laves et professionelt produktbillede.

**Architecture:**
- Tre nye staff-routes under `/api/admin/accessories/`:
  - `identify`: Claude vision + eksakt kodematch + dublet-kandidater
  - `studio-photo`: OpenAI image edit
  - by-ean POST udvides med `publish`
- Rene hjælpefunktioner i `src/lib/accessory-intake/` (pris, rensning, scoring) med unit-tests.
- UI'et i `quick-cover.tsx` deles i underkomponenter.

**Tech Stack:** Next.js App Router, `@anthropic-ai/sdk` (`messages.parse` + `zodOutputFormat`, som `src/app/api/admin/products/copywrite/route.ts`), OpenAI REST via `fetch`, Supabase admin client, vitest.

**Spec:** `docs/superpowers/specs/2026-10-28-ai-tilbehoer-optagelse-design.md`

## Global Constraints

- Ingen emojis. Aldrig "Panserglas". Tilbehør = "2 års reklamationsret", aldrig 36 måneders garanti. Aldrig "Foxway"/"dropship". Aldrig "original kasse".
- Ingen førpris. `salePrice: null` altid. Gamle prismærker ignoreres, og AI returnerer aldrig priser.
- AI må kun skrive egenskaber, der er trykt på pakken eller synlige.
- Lager lægges aldrig på en eksisterende vare uden et tryk fra praktikanten.
- En publiceret vare til fuld pris får aldrig ny pris fra hurtig-flowet.
- Ingen migrationer. Ingen ændring af checkout/betaling/fragt.
- Claude-model: `claude-sonnet-5-5`. OpenAI: `gpt-image-1`, `input_fidelity: "high"`, `quality: "medium"`, `size: "1024x1024"`.
- Prisforslag:

  | Gruppe | Pris |
  |---|---|
  | Ægte Apple/Samsung cover | 99 |
  | Kendt mærke | 79 |
  | Flip/pung kendt mærke | 99 |
  | No-name/løs | 59 |
  | Glas | 49 |

  Chips: 49/59/79/99/129.
- Danske commit-beskeder.

## Review Focus

1. **AI-kald fejler, tager over 20 s, eller nøglen mangler.** Flowet fortsætter manuelt med skabelontekst, og der vises aldrig en blank skærm. (Task 3: test med mock der kaster.)
2. **AI returnerer en model-slug, der ikke findes**, eller tekst med "Panserglas"/"36 måneder". Slug fjernes, og teksten renses. (Task 2: tests.)
3. **Lav model-sikkerhed.** Gem er låst, indtil praktikanten aktivt har bekræftet modellen. (Task 6: state-guard `modelConfirmed`.)
4. **Trykt varekode matcher en publiceret Rixus-vare til fuld pris.** Kun lager lægges til, og prisen ændres ikke. (Task 5: test.)
5. **Samme cover fotograferet løst bagefter pakket.** Dubletsøgning rammer på oplysninger, ikke billede. (Task 2: score-test med samme brand/model/type/farve.)

---

### Task 1: Attributter og modelliste

**Files:**
- Modify: `src/lib/admin/products/attributes.ts:33-42` (cover + screen_protector)
- Modify: `src/lib/tilbehoer-config.ts:18-22, 191+`
- Modify: offentlige forbrugere, så de bruger `PUBLIC_TILBEHOER_DEVICES`:
  - `src/components/tilbehoer/tilbehoer-sidebar.tsx`
  - `src/components/tilbehoer/tilbehoer-mobile-filters.tsx`
  - `src/components/tilbehoer/brand-carousel.tsx`
  - `src/app/beskyttelsesglas/_components/{BrandGrid,SmartSearch,SpotPicker}.tsx`
  - `src/app/sitemap.ts` (tilbehør-modelsider; covers-udsalg beholder fuld liste)
- Test: `src/lib/__tests__/tilbehoer-devices.test.ts`

**Interfaces:**
- Produces:
  - `TilbehoerDevice.legacy?: boolean`
  - `export const PUBLIC_TILBEHOER_DEVICES: TilbehoerDevice[]` (uden legacy)
  - attributter `udsalg` (select ["Ja"]), `genuine` (select ["Ja"]), `ai_read_text` (text) på `cover` og `screen_protector`

- [ ] **Step 1: Write the failing test**

```ts
it("har unikke slugs", () => { expect(new Set(TILBEHOER_DEVICES.map(d=>d.slug)).size).toBe(TILBEHOER_DEVICES.length) });
it("har ældre modeller som legacy", () => { for (const s of ["galaxy-s8","galaxy-s20-ultra","galaxy-a23","iphone-11-pro-max"]) expect(TILBEHOER_DEVICES.find(d=>d.slug===s)).toBeTruthy() });
it("PUBLIC_ udelader legacy", () => { expect(PUBLIC_TILBEHOER_DEVICES.some(d=>d.legacy)).toBe(false) });
it("cover og glas tillader udsalg/genuine/ai_read_text", () => { for (const t of ["cover","screen_protector"]) for (const k of ["udsalg","genuine","ai_read_text"]) expect(TYPE_ATTRIBUTES[t].some(f=>f.key===k)).toBe(true) });
```

- [ ] **Step 2:** Run `npx vitest run src/lib/__tests__/tilbehoer-devices.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - Add the missing older models with `legacy: true`, per spec list. Existing slugs are checked first; existing models are not marked legacy.
  - Add the attributes.
  - Swap the public consumers to `PUBLIC_TILBEHOER_DEVICES`.
- [ ] **Step 4:** Run the test plus `npx tsc --noEmit`. Expected: PASS, no errors.
- [ ] **Step 5:** Commit: `feat: ældre modeller (legacy) og udsalg-attributter til glas`.

### Task 2: Rene hjælpere (pris, rensning, scoring)

**Files:**
- Create: `src/lib/accessory-intake/types.ts`, `pricing.ts`, `sanitize.ts`, `match.ts`
- Test: `src/lib/accessory-intake/__tests__/{pricing,sanitize,match}.test.ts`

**Interfaces:**
- Produces (types.ts):

```ts
export type IntakeProductType = "cover" | "flip_cover" | "screen_protector" | "other";
export interface Identified {
  productType: IntakeProductType; brand: string | null; isGenuineBrandProduct: boolean;
  models: string[]; unknownModelText: string | null; modelConfidence: "high" | "medium" | "low";
  caseType: "Clear"|"Slim"|"Rugged"|"Wallet"|"Flip"|"Bumper"|null; color: string | null;
  features: string[]; titleDa: string; descriptionDa: string; supplierCodes: string[]; readText: string;
}
export interface MatchCandidate { id: string; title: string; images: string[] | null; selling_price: number; status: string; subcategory: string; brand: string | null; compatible_models: string[] | null; attributes: Record<string,string> | null; stock: Record<string, number>; score: number }
```

  - `suggestPriceKr(i: Pick<Identified,"productType"|"brand"|"isGenuineBrandProduct"|"caseType">): number`
  - `KNOWN_BRANDS: string[]` (NovaNL, Rixus, Celly, Swissten, Shield, Spigen, Otterbox, Holdit, iDeal of Sweden, Panzer… ingen "Panserglas"-tekst ud af det)
  - `sanitizeIdentified(raw: Identified, validSlugs: Set<string>): Identified`. Fjerner ukendte slugs. Er der ingen slugs tilbage, sættes `modelConfidence = "low"`. Fjerner emojis, erstatter "panserglas" (case-insensitive) med "beskyttelsesglas" og fjerner sætninger med "36 m" + "garanti".
  - `scoreCandidate(i: Identified, c: Omit<MatchCandidate,"score"|"stock">): number`. Model-overlap kræves (ellers 0). Samme subcategory +3, brand +2, case_type +2, color +2.
  - `subcategoryFor(t: IntakeProductType): "cover"|"screen_protector"|"other"`. flip_cover → cover.

- [ ] **Step 1: Write failing tests**

```ts
expect(suggestPriceKr({productType:"cover",brand:"Apple",isGenuineBrandProduct:true,caseType:"Slim"})).toBe(99);
expect(suggestPriceKr({productType:"cover",brand:"NovaNL",isGenuineBrandProduct:false,caseType:"Slim"})).toBe(79);
expect(suggestPriceKr({productType:"flip_cover",brand:"NovaNL",isGenuineBrandProduct:false,caseType:"Flip"})).toBe(99);
expect(suggestPriceKr({productType:"cover",brand:null,isGenuineBrandProduct:false,caseType:"Clear"})).toBe(59);
expect(suggestPriceKr({productType:"screen_protector",brand:"Swissten",isGenuineBrandProduct:false,caseType:null})).toBe(49);
// sanitize
const s = sanitizeIdentified({...base, models:["iphone-13","iphone-99"], titleDa:"Panserglas til iPhone 13", descriptionDa:"Godt. 36 måneders garanti."}, new Set(["iphone-13"]));
expect(s.models).toEqual(["iphone-13"]); expect(s.titleDa).toBe("beskyttelsesglas til iPhone 13".replace(/^b/,"B")); expect(s.descriptionDa).not.toMatch(/36/);
expect(sanitizeIdentified({...base, models:["x"]}, new Set()).modelConfidence).toBe("low");
// match
expect(scoreCandidate(ident13SlimSortApple, {...cand, compatible_models:["iphone-13"], subcategory:"cover", brand:"Apple", attributes:{case_type:"Slim",color:"Sort"}})).toBe(9);
expect(scoreCandidate(ident13SlimSortApple, {...cand, compatible_models:["iphone-14"]})).toBe(0);
```

- [ ] **Step 2:** Run `npx vitest run src/lib/accessory-intake`. Expected: FAIL.
- [ ] **Step 3:** Implement the four files.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: hjælpere til AI-optagelse (pris, rensning, dubletscore)`.

### Task 3: `POST /api/admin/accessories/identify`

**Files:**
- Create: `src/app/api/admin/accessories/identify/route.ts`
- Create: `src/lib/accessory-intake/candidates.ts`
- Test: `src/app/api/admin/accessories/identify/__tests__/route.test.ts`

**Interfaces:**
- Consumes: Task 2 types/sanitize/score; `requireStaff`; `createAdminClient`.
- Produces:
  - Request body `{ image: string /* base64 jpeg uden data:-præfiks */, mediaType?: "image/jpeg" }` (max 6 MB).
  - Response `{ identified: Identified | null, exact: MatchCandidate | null, candidates: MatchCandidate[], priceKr: number, aiError?: string }`.
  - `findCandidates(db, i: Identified): Promise<{ exact: MatchCandidate|null; candidates: MatchCandidate[] }>` in candidates.ts:
    - **exact** = accessory where `ean` or `barcode` is in `supplierCodes` (each code validated `^[A-Za-z0-9-]{4,32}$`).
    - **candidates** = accessories, not archived, with `compatible_models && models`, and where (`attributes->>udsalg = 'Ja'` OR brand ilike Rixus/NovaNL). Scored, score ≥ 5, top 3, stock per store as in by-ean GET.
    - Move by-ean's `storeLocations` + stock map to candidates.ts and reuse it there.

- [ ] **Step 1: Write failing tests** (mock `@anthropic-ai/sdk` and `@/lib/supabase/admin`, `requireStaff`):
  - `401 uden staff`
  - `400 uden image`
  - `returnerer renset identified + priceKr 99 for ægte Apple-cover`
  - `aiError og identified null når Anthropic kaster — status 200`
  - `exact sat når supplierCodes rammer barcode`
- [ ] **Step 2:** Run `npx vitest run src/app/api/admin/accessories/identify`. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - Call `client.messages.parse` with `model: "claude-sonnet-5-5"`, `max_tokens: 1500`, image content block, `output_config.format: zodOutputFormat(schema)`. Use `AbortSignal.timeout(20000)`.
  - The system prompt holds the Global Constraints rules, the model list as `slug: label` lines, and the title format `"{Mærke} {type} til {model(ler)}, {farve}"`. Brand names only for the brand's own product, otherwise `"… til iPhone 13"`. No prices.
  - If `ANTHROPIC_API_KEY` is missing, return `aiError: "AI er ikke sat op"`.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: AI-aflæsning af tilbehør fra foto med dubletsøgning`.

### Task 4: `POST /api/admin/accessories/studio-photo` + Vercel-nøgle

**Files:**
- Create: `src/app/api/admin/accessories/studio-photo/route.ts`
- Test: `src/app/api/admin/accessories/studio-photo/__tests__/route.test.ts`

**Interfaces:**
- Produces: multipart `image` (PNG, the cut-out) → `image/png` body (1024²), or `503 { error }` without a key, `502` on API error. The client converts to WebP and uploads with `uploadImageBlob`.

- [ ] **Step 1: Write failing tests** (mock global `fetch`):
  - `401 uden staff`
  - `503 uden OPENAI_API_KEY`
  - `sender gpt-image-1 med input_fidelity high og returnerer png`
  - `502 når OpenAI svarer fejl`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - `fetch("https://api.openai.com/v1/images/edits")` with FormData: `model`, `image`, `prompt`, `input_fidelity`, `quality`, `size`, `background: "opaque"`. Decode `data[0].b64_json`.
  - Prompt (exact copy): "Professional e-commerce product photo of exactly this phone accessory. Keep the product identical: same shape, colour, print, logo, cut-outs and material. Do not add, remove or change anything on the product. Plain light warm grey background (#f5f5f2), soft natural shadow underneath, product centred and filling about 80% of the frame, straight-on front view, sharp focus, no text, no props, no hands."
  - `maxDuration = 60`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Add the key to Vercel prod: read only `OPENAI_API_KEY` from `.env.local` and pipe it to `npx vercel env add OPENAI_API_KEY production` without printing it. Then run `npx vercel env ls production | grep OPENAI`. Expected: one line.
- [ ] **Step 6:** Commit: `feat: AI-studiofoto af tilbehør (OpenAI)`.

### Task 5: by-ean POST med `publish`

**Files:**
- Modify: `src/app/api/admin/accessories/by-ean/route.ts:62-105`
- Test: `src/app/api/admin/accessories/by-ean/__tests__/route.test.ts` (create if missing)

**Interfaces:**
- Produces:
  - POST body: `{ productId, store, quantity, publish?: { priceKr?: number } }`.
  - Response `{ quantity, published: boolean, priceKr: number }`.
- Rules (from spec):
  - Draft + subcategory cover: `status=published`, `selling_price=priceKr*100`, `attributes.udsalg="Ja"`.
  - Draft + other type: `status=published` at the existing price.
  - Already published: price is ignored, only stock.
  - Revalidate `/covers-udsalg` and `/tilbehoer`.

- [ ] **Step 1: Write failing tests:**
  - `kladde-cover publiceres til 79 kr. med udsalg`
  - `kladde-oplader publiceres til eksisterende pris uden udsalg`
  - `publiceret vare beholder pris selvom priceKr sendes`
  - `uden publish lægges kun lager (uændret adfærd)`
- [ ] **Step 2:** Run `npx vitest run src/app/api/admin/accessories/by-ean`. Expected: FAIL.
- [ ] **Step 3:** Implement. Also return `subcategory` and `brand` in GET so the UI can show the right button.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: udgiv kladde og sæt på udsalg fra hurtig-optagelsen`.

### Task 6: UI — foto først, kandidater, flere modeller, to billeder

**Files:**
- Modify: `src/components/admin/products/quick-cover.tsx` (split it up)
- Create:
  - `src/components/admin/products/quick-intake/identify-step.tsx`: foto til aflæsning + "Spring AI over"
  - `src/components/admin/products/quick-intake/match-card.tsx`: "Den har du allerede oprettet" (bruges til eksakt, scan og kandidater)
  - `src/components/admin/products/quick-intake/photo-picker.tsx`: produktfoto → (a) fritlagt studio og (b) AI-studio, vælg én, "Brug samme foto"
- Modify: `src/app/(admin)/admin/nav.ts` + global-search-genvej + accessory-list-knap: rename to "Hurtig tilbehørsoptagelse". URL unchanged.

**Interfaces:**
- Consumes: Task 3 response, Task 4 endpoint, Task 5 `publish`, `ModelsPicker` (`src/components/admin/products/create/models-picker.tsx`, props `selected`/`onChange`), Task 2 `subcategoryFor`, `suggestPriceKr`.
- State/flow:
  - Steps: `scan` → (known code: `existing`) | `identify` → (`exact`/`candidates`: `match`) → `new` → `done`.
  - In `new`, the form is prefilled from `identified`. Fields:
    - type chips Cover/Flip/Glas/Andet
    - ModelsPicker (multi)
    - caseType/colour chips
    - price chips 49/59/79/99/129 with the suggestion selected
    - editable title (Input) and description (Textarea)
    - quantity
  - `modelConfirmed` is false when `modelConfidence==="low"` or models are empty, and becomes true when ModelsPicker changes. Gem requires `models.length>0 && modelConfirmed && photo && qty>=1`.
  - `productType==="other"` gives `status: "draft"` without `udsalg`.
  - `screen_protector` gives `attributes: { udsalg: "Ja", genuine? }`.
  - Always `ai_read_text` (max 500 tegn).
  - "Næste" keeps store and price; "Ny kasse" resets everything.
  - AI fields show the label "Udfyldt af AI, tjek" (`text-[12px] text-charcoal/60`). No emojis.

- [ ] **Step 1:** Run `npx tsc --noEmit` and `npx vitest run --dir src`. Expected: only the known pre-existing failures (reparation/priser, flaky sell-device-wizard).
- [ ] **Step 2:** Commit: `feat: hurtig tilbehørsoptagelse med AI-aflæsning, dubletter og studiofoto`.
- [ ] **Step 3:** Push `main`, wait for Vercel Ready, then live-test in Chrome with the owner's admin session:
  - (a) packaged Apple cover photo → prefilled, price 99
  - (b) loose cover → low confidence locks Gem
  - (c) the same cover again → "allerede oprettet" → stock added
  - (d) a Rixus code → existing product
  - (e) AI studio photo shown next to the plain one
  - Delete the test products afterwards via DELETE `/api/admin/products/{id}`.
- [ ] **Step 4:** Update `docs/marketing-2026-10/covers-udsalg/00-plan.md` (praktikant-vejledning) and memory `project_covers_udsalg_2026_10_28.md`.

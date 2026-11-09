# D2: Opkøb i butikken og brugtmomskæden — implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En medarbejder kan lave et lovligt opkøb ved disken på under 2 minutter. Opkøbet giver en slutseddel og en lagerenhed med IMEI, indkøbspris og momsordning. Kassen kan modregne opkøbet i et køb og gemmer IMEI på bonen.

**Architecture:**
- Slutsedlen (`trade_in_receipts` + `trade_in_receipt_items`) bliver det eneste indkøbsbilag ved opkøb, både i butikken og fra hjemmesiden.
- Bekræftelse sker i én databasefunktion, `trade_in_confirm`, der gør alt eller intet:
  - giver bilagsnummer pr. juridisk enhed
  - tager et snapshot af købende selskab
  - opretter `devices`, `purchase_documents` og `stock_movements`
- Efter bekræftelse låser triggere bilaget. Kun betalings-, scan- og mistankefelter kan sættes.
- Alle API-ruter bruger `requirePosStaff` (ekspedienten er aktøren) og `assertLocationAccess`. Tabellerne kan kun læses af serveren.

**Tech Stack:** Next.js App Router, Supabase Postgres (migrationer med `node scripts/apply-migration.mjs <fil>`, forespørgsler med `--query`), zod, vitest, `@react-pdf/renderer` (`renderToBuffer`), Resend (`src/lib/email/resend.ts`), Supabase Storage (bucket `slutsedler`, privat). Ingen nye afhængigheder.

**Spec:** `docs/superpowers/specs/2026-11-06-kassesystem-fixon-design.md` (afsnit D2 og "Tillæg 2026-11-08"). Lovgrundlag: `docs/superpowers/specs/2026-11-08-opkoeb-lovgrundlag.md`.

## Global Constraints

- **Beløb** er heltal i øre overalt (`trade_in_receipt_items.price`, `devices.purchase_price`, `order_items.*`). Visning: `formatDKK` / `money.ts`.
- **Ejerbeslutning 2026-11-09:** ID kræves kun, når slutsedlens samlede beløb er **over 2.000 kr.** (`total_amount > 200000`). Præcis 2.000,00 kr. kræver ikke ID.
- **ID-typer** (billed-ID eller MitID, BEK 1497 § 5): `pas`, `koerekort`, `id_kort`, `mitid`. Sundhedskort er ikke gyldigt; det har intet billede. Udløbsdato er påkrævet for de tre billed-ID'er og må ikke ligge før i dag. Ved `mitid` er ID-nummeret verifikations-referencen, og der er ingen udløbsdato.
- **Gem aldrig CPR-nummer og aldrig billede eller kopi af ID.** ID-felterne nulstilles automatisk 5 år efter `confirmed_at`.
- **Sælgeren skal være mindst 18 år**, når sælgeren er en privatperson. Det registreres som et påkrævet flueben, ikke som en fødselsdato. Ved firmasalg vises fluebenet ikke.
- **Udbetaling** sker kun som bankoverførsel til en konto i sælgerens navn, med påkrævet flueben, eller som modregning i et køb i kassen. Der udbetales aldrig kontant.
- **Købende selskab** er butikkens juridiske enhed. Slagelse er PhoneGo ApS (CVR 38688766), resten er Fixon ApS (CVR 46079019). PhoneGo må stå på bilag fra Slagelse, men aldrig på hjemmesiden.
- **Bilagsnumre** følger én fortløbende serie pr. juridisk enhed og år og gives først ved bekræftelse, så kladder ikke bruger numre:
  - Fixon: `SS-2026-0001`
  - PhoneGo: `SP-2026-0001`
- **Momsordning** udledes af sælgertype og fakturatype. Den ansatte vælger den aldrig direkte.

  | Sælger | Fakturatype | `vat_scheme` | `devices.purchase_price` |
  |---|---|---|---|
  | privat | (ingen) | `brugtmoms` | pris |
  | firma | `brugtmoms` (påtegnet fortjenstmargenordning) | `brugtmoms` | pris |
  | firma | `med_moms` | `regular` | `round(pris × 4 / 5)` (ekskl. moms) |
  | firma | `eu_normal` | `regular` | pris |

- **Slutsedlen viser aldrig moms.**
- **Esbjergs adresse** må aldrig vises nogen steder: ikke på slutsedlen, ikke på PDF'en, ikke i mails. Butikken vises kun som "Esbjerg".
- **Bogførte rækker** ændres ikke. Der tilføjes kun kolonner og tabeller. En bekræftet slutseddel kan annulleres med en begrundelse, men den slettes aldrig.
- **Sprog:** UI på dansk, sentence case, DM Sans, ingen emojis. Ingen tekst med "Panserglas", "Foxway" eller "dropship".
- **Migrationer** køres i prod af implementøren og verificeres med en forespørgsel bagefter. SQL-funktioner testes med et smoke-script i `BEGIN … ROLLBACK`.
- **Tests:** Fejl, der allerede findes på main (3 i repairs-API, booking-wizard, sell-device m.fl.), er ikke denne plans ansvar. Der må ikke komme nye. Kør berørte testfiler enkeltvis; hele suiten timer ud under belastning.

## Rulings truffet i planen (ejeren kan ændre dem)

- **IMEI ved salg:** Hvis enheden allerede har IMEI, gemmes det automatisk på bonen, og der skal ikke tastes noget. Mangler enheden IMEI, og er den brugtmoms, beder kassen om det, og salget afvises uden. Det holder disken hurtig og opfylder kravet om IMEI ved salg.
- **Green.dk:** I D2 er der kun et link, "Se Green.dk's pris", der åbner Green.dk. Automatisk prishentning bygges først, når deres vilkår er tjekket.
- **Ukendt model:** Migrationen opretter fire skjulte "Andet"-skabeloner (telefon, tablet, computer, ur), så der kan købes ind, selvom modellen ikke findes i kataloget.
- **Stand → lagergrad:** Perfekt→A, God→B, Acceptabel→C, Defekt→C. Lagerenheder fra opkøb oprettes med status `intake`.
- **Firmakøb:** Firmaets egen faktura erstatter den underskrevne seddel. "Udbetalt" kræver, at fakturaen er lagt op.
- **Opkøb fra hjemmesiden** bruger samme editor, udfyldt på forhånd fra henvendelsen. Accepterer sælgeren online (et accepteret tilbud), erstatter det underskriften (`attestation = 'online_accept'`). ID-kravet over 2.000 kr. gælder også her. Se "Åbent for ejeren" nederst.

## Review Focus

1. **Forkert butik.** En Vejle-medarbejder må ikke kunne åbne, bekræfte, udbetale eller se filerne på en slutseddel fra Slagelse. Det giver 403, også via fil-URL'en. Testes i Task 4 og Task 6.
2. **Grænsen på 2.000 kr.** 200000 øre bekræftes uden ID. 200001 øre afvises uden ID. Det gælder både i TS-reglen og i SQL-funktionen. Testes i Task 1 og Task 3.
3. **Dobbelt modregning.** Det samme opkøb må ikke kunne modregnes i to salg, heller ikke samtidig. Låsen i `pos_create_sale` skal holde. Testes i Task 10.
4. **IMEI, der allerede er på lager.** Et opkøb med et IMEI, der findes på en usolgt enhed, afvises. Er enheden med det IMEI solgt, er det tilladt, for den kan være købt tilbage. Testes i Task 3.
5. **Låst bilag.** Efter bekræftelse kan pris, sælger, ID og varelinjer ikke ændres, heller ikke med en direkte `UPDATE` med service-nøglen. En solgt enheds IMEI og indkøbspris kan ikke ændres. Testes i Task 2 (smoke-SQL).

---

### Task 1: Regler og skemaer for opkøb (ren TypeScript)

**Files:**
- Create: `src/lib/opkoeb/rules.ts`, `src/lib/opkoeb/schemas.ts`
- Test: `src/lib/opkoeb/__tests__/rules.test.ts`, `src/lib/opkoeb/__tests__/schemas.test.ts`

**Interfaces:**
- Produces (`rules.ts`):
  - `ID_REQUIRED_ABOVE_OERE = 200000`
  - `ID_TYPES = ["pas","koerekort","id_kort","mitid"] as const`, `ID_TYPE_LABELS` (Pas, Kørekort, ID-kort, MitID)
  - `type SellerType = "private" | "business"`, `INVOICE_TYPES = ["med_moms","brugtmoms","eu_normal"] as const`
  - `isValidImei(s: string): boolean`: 15 cifre, Luhn
  - `normalizeIdentifier(raw: string): { kind: "imei" | "serial"; value: string } | null`: trimmer og fjerner mellemrum. 15 cifre med gyldig Luhn giver imei. 15 cifre med ugyldig Luhn giver null. 5–30 tegn `[A-Z0-9]` (uppercase) giver serial.
  - `idRequired(totalOere: number): boolean`
  - `vatSchemeFor(seller: SellerType, invoice: InvoiceType | null): "brugtmoms" | "regular"`
  - `deviceCostOere(priceOere: number, seller: SellerType, invoice: InvoiceType | null): number`: følger tabellen i Global Constraints
  - `GRADE_FROM_CONDITION: Record<"Perfekt"|"God"|"Acceptabel"|"Defekt", "A"|"B"|"C">`
  - `confirmBlockers(r: ReceiptForRules, today: string): string[]`: danske beskeder, tom liste betyder klar
  - `payBlockers(r: ReceiptForRules): string[]`
  - `payoutRemainderOere(r: ReceiptForRules): number`: `total_amount - (offset_amount ?? 0)`
  - `type ReceiptForRules`: de felter fra Task 2's kolonner, som reglerne læser
- Produces (`schemas.ts`): `receiptDraftSchema` (opret og ret kladde), `payBodySchema`, `suspicionBodySchema`, `voidBodySchema`, `uploadKindSchema = z.enum(["signed_scan","invoice","payout_proof"])`.

- [ ] **Step 1: Skriv fejlende tests**

```ts
expect(isValidImei("490154203237518")).toBe(true);
expect(isValidImei("490154203237519")).toBe(false);
expect(normalizeIdentifier(" 4901 5420 3237 518 ")).toEqual({ kind: "imei", value: "490154203237518" });
expect(normalizeIdentifier("490154203237519")).toBeNull();
expect(normalizeIdentifier("c02xk1zjjg5h")).toEqual({ kind: "serial", value: "C02XK1ZJJG5H" });
expect(idRequired(200000)).toBe(false);
expect(idRequired(200001)).toBe(true);
expect(vatSchemeFor("private", null)).toBe("brugtmoms");
expect(vatSchemeFor("business", "med_moms")).toBe("regular");
expect(deviceCostOere(125000, "business", "med_moms")).toBe(100000);
expect(deviceCostOere(125000, "private", null)).toBe(125000);
// confirmBlockers: én privat seddel på 2.500 kr uden ID → indeholder "ID kræves over 2.000 kr."
// … med id_type "koerekort", nummer, udløb "2026-11-08" og today "2026-11-09" → indeholder "ID'et er udløbet"
// … privat uden seller_age_confirmed → "Sælger skal være fyldt 18" (firma: ingen sådan besked)
// … uden lock_checks_confirmed → "Tjek Find My og spærring"
// … firma uden seller_cvr (8 cifre) eller invoice_type → hver sin besked
// … ingen varer, eller en vare uden template_id / gyldigt identifier / pris > 0 → besked med varens nummer
// payBlockers: privat uden signed_scan_path → "Læg den underskrevne slutseddel op"
// firma uden invoice_file_path → "Læg firmaets faktura op"
// bank uden reg (4 cifre) / konto (6–10 cifre) / account_owner_confirmed → hver sin besked
// suspected_at sat → "Opkøbet er spærret ved mistanke"; status ≠ "confirmed" → "Kun bekræftede slutsedler kan udbetales"
// attestation "online_accept" + privat → kræver ikke signed_scan_path
// offset_amount 100000 af total 300000 → payBlockers tjekker kun bank/scan for restbeløbet; payoutRemainderOere(r) === 200000
```

`schemas.test.ts` tester, at `receiptDraftSchema`:
- afviser CPR-lignende input i `id_number` (`/^\d{6}-?\d{4}$/` giver fejlen "Skriv ikke CPR-nummer")
- afviser `id_type: "sundhedskort"`
- accepterer en minimal privat kladde med én vare

- [ ] **Step 2: Kør testene, og se dem fejle**

Run: `npx vitest run src/lib/opkoeb`
Expected: FAIL (modulerne findes ikke)

- [ ] **Step 3: Implementér `rules.ts` og `schemas.ts`**

Beskederne er præcis de strenge, der står i testene. Skemaerne genbruger konstanterne fra `rules.ts`.

- [ ] **Step 4: Kør testene, og se dem bestå**

Run: `npx vitest run src/lib/opkoeb`
Expected: PASS

- [ ] **Step 5: Commit** — `feat(opkoeb): regler for ID, IMEI, momsordning og udbetaling`

---

### Task 2: Migration: skema, låse og adgang

**Files:**
- Create: `supabase/migrations/20261109120000_d2_opkoeb_schema.sql`
- Create: `scripts/sql/d2-smoke-schema.sql` (smoke-test i `BEGIN … ROLLBACK`)

**Interfaces:**
- Produces (kolonner, som senere tasks bruger med præcis disse navne):
  - `legal_entities`: `address text`, `receipt_prefix text`. Fixon får `'Løversysselvej 3C, 7100 Vejle'` og `'SS'`. PhoneGo får `NULL` og `'SP'`.
  - `trade_in_receipts`, nye kolonner:
    - `location_id uuid references locations`
    - `legal_entity_id uuid references legal_entities`
    - `seller_type text not null default 'private'` (`private|business`)
    - `seller_cvr text`, `invoice_type text` (`med_moms|brugtmoms|eu_normal`)
    - `seller_age_confirmed bool not null default false`
    - `lock_checks_confirmed bool not null default false`, `lock_checks_by uuid`, `lock_checks_at timestamptz`
    - `id_type text`, `id_number text`, `id_expiry date`, `id_checked_by uuid`, `id_checked_at timestamptz`, `id_purged_at timestamptz`
    - `attestation text not null default 'paper_scan'` (`paper_scan|online_accept`)
    - `signed_scan_path text`, `invoice_file_path text`, `payout_proof_path text`
    - `payout_method text` (`bank|modregning`), `account_owner_confirmed bool not null default false`
    - `offset_order_id uuid references orders`, `offset_amount integer`
    - `created_by uuid`, `confirmed_by uuid`, `paid_by uuid`
    - `suspected_at timestamptz`, `suspected_by uuid`, `suspicion_note text`, `police_notified_at timestamptz`
    - `voided_at timestamptz`, `voided_by uuid`, `void_reason text`
  - `trade_in_receipts` ændres også sådan:
    - `receipt_number` må være NULL (kladder). Den unikke nøgle beholdes.
    - status-check: `draft|confirmed|paid|completed|voided`
  - `trade_in_receipt_items`, nye kolonner:
    - `template_id uuid references product_templates`
    - `battery_health int` (0–100)
    - `suggested_price integer`
    - `device_id uuid references devices`
  - `devices`: `blocked_at timestamptz`, `blocked_reason text`
  - `order_items`: `imei text`
  - `purchase_documents`: `trade_in_receipt_id uuid references trade_in_receipts`
  - Ny tabel `slutseddel_counters(legal_entity_id uuid, year int, last_number int, primary key(legal_entity_id, year))`
  - Ny tabel `device_changes(id uuid pk, device_id uuid, field text, old_value text, new_value text, changed_at timestamptz default now())`
  - `stock_movements.reason`-check udvides med `'purchase'`
  - Fire `product_templates` med `status='draft'`:
    - slugs `andet-telefon`, `andet-tablet`, `andet-computer`, `andet-ur`
    - brand `Andet`, model `Andet (telefon)` osv.
    - kategorierne `smartphone`, `tablet`, `laptop`, `smartwatch`

- [ ] **Step 1: Skriv smoke-SQL'en først** (`scripts/sql/d2-smoke-schema.sql`, `BEGIN; … ROLLBACK;`). Den skal bevise:
  - En `UPDATE trade_in_receipts SET total_amount = 1` på en række med `status='confirmed'` fejler med `receipt_locked`.
  - En `UPDATE … SET paid_at = now(), status = 'paid'` på samme række lykkes.
  - Et UPDATE eller DELETE på en `trade_in_receipt_items`-række, hvis seddel er bekræftet, fejler.
  - På en enhed med `status='sold'` fejler en ændring af `imei` eller `purchase_price`, og et `DELETE` fejler. En ændring af `status` til `returned` lykkes.
  - En ændring af `imei` på en usolgt enhed lykkes og skriver én række i `device_changes`.
  - `UPDATE devices SET status='listed'` på en enhed med `blocked_at` sat fejler med `device_blocked`.

- [ ] **Step 2: Kør smoke-SQL'en mod prod, og se den fejle**

Run: `node scripts/apply-migration.mjs scripts/sql/d2-smoke-schema.sql`
Expected: fejl (kolonnerne findes ikke)

- [ ] **Step 3: Skriv migrationen**

Den indeholder kolonnerne ovenfor plus:
- **Trigger `trade_in_receipts_guard`** (BEFORE UPDATE OR DELETE).
  - Når `OLD.status <> 'draft'`:
    - DELETE afvises.
    - UPDATE må kun ændre `status`, `paid_*`, `payout_*`, `account_owner_confirmed`, `signed_scan_path`, `invoice_file_path`, `payout_proof_path`, `offset_*`, `suspected_*`, `suspicion_note`, `police_notified_at`, `voided_*`, `void_reason`, `updated_at`.
    - ID-felterne må kun sættes til NULL, og kun sammen med `id_purged_at`.
    - Alt andet giver `RAISE EXCEPTION 'receipt_locked'`.
  - Tilladte statusskift: `confirmed→paid`, `confirmed→voided`, `paid→completed`.
- **Trigger `trade_in_receipt_items_guard`:** UPDATE og DELETE afvises, når sedlens status ≠ `draft`.
- **Trigger `devices_purchase_guard`** (BEFORE UPDATE OR DELETE):
  - Ved `OLD.status IN ('sold','shipped','picked_up')` afvises DELETE og enhver ændring af `imei`, `serial_number`, `purchase_price` og `vat_scheme` (`device_locked`).
  - Ellers skrives en række i `device_changes` pr. ændret felt af de fire.
  - `NEW.blocked_at IS NOT NULL AND NEW.status IN ('listed','reserved','sold')` giver `device_blocked`.
- **RLS:** `DROP POLICY "Authenticated full access"` på `trade_in_receipts`, `trade_in_receipt_items` og `trade_in_receipt_counters`. RLS forbliver slået til uden politikker, så kun service-rollen har adgang. `slutseddel_counters` og `device_changes` får RLS uden politikker.
- **pg_cron-job `slutseddel-id-purge`** (`15 3 * * *`):
  - sætter `id_type`, `id_number`, `id_expiry` til NULL og `id_purged_at = now()`, hvor `confirmed_at < now() - interval '5 years'` og `id_purged_at IS NULL`
  - sletter kladder (`status='draft'`) ældre end 30 dage, sammen med deres varer

Sæt `legal_entity_id` på eksisterende rækker er ikke nødvendigt (0 slutsedler i prod pr. 2026-11-09). Migrationen tjekker det med `DO $$ … IF (SELECT count(*) FROM trade_in_receipts) > 0 THEN RAISE … $$`.

- [ ] **Step 4: Kør migrationen og smoke-SQL'en**

Run: `node scripts/apply-migration.mjs supabase/migrations/20261109120000_d2_opkoeb_schema.sql` og derefter smoke-filen.
Expected: HTTP 201 for begge. Smoke-filen slutter med `ROLLBACK` og fejler ikke. Brug `DO`-blokke, der fanger de forventede fejl og `RAISE`'r, hvis en forventet fejl udebliver.

- [ ] **Step 5: Verificér**

`--query "select policyname from pg_policies where tablename like 'trade_in%'"` giver `[]`. `--query "select jobname from cron.job where jobname='slutseddel-id-purge'"` giver 1 række.

- [ ] **Step 6: Commit** — `feat(opkoeb): skema, låse og serveradgang for slutsedler`

---

### Task 3: Databasefunktioner: bekræft og annullér

**Files:**
- Create: `supabase/migrations/20261109121000_d2_trade_in_confirm.sql`, `scripts/sql/d2-smoke-confirm.sql`
- Modify: `src/lib/pos/errors.ts` (danske beskeder for de nye koder)
- Test: `src/lib/pos/__tests__/errors.test.ts` (eller den eksisterende testfil for `toPosError`)

**Interfaces:**
- Consumes: kolonnerne fra Task 2 og `public.pos_fail(code text, detail text default null)` (SQLSTATE PS001, mappes af `toPosError`).
- Produces:
  - `trade_in_confirm(p_receipt_id uuid, p_staff_id uuid) RETURNS jsonb`. Returnerer `{receipt_number, device_ids: uuid[]}`. Den er `SECURITY DEFINER`, har `search_path` som `pos_create_sale` og er `REVOKE`'et fra `public`, `anon` og `authenticated`.
  - `trade_in_void(p_receipt_id uuid, p_staff_id uuid, p_reason text) RETURNS void`, med samme sikkerhed.
  - Fejlkoder: `receipt_not_draft`, `receipt_empty`, `item_invalid`, `checks_missing`, `age_missing`, `id_required`, `id_expired`, `business_fields_missing`, `imei_in_stock`, `location_missing`, `receipt_not_voidable`, `void_reason_required`.

- [ ] **Step 1: Skriv smoke-SQL** (`BEGIN … ROLLBACK`). Opret en Vejle-kladde med 2 varer á 1.500 kr (i alt 3.000 kr) og kald `trade_in_confirm`:
  - Uden ID giver det `id_required`.
  - Med `koerekort`, nummer og udløb i morgen lykkes det:
    - `receipt_number` matcher `^SS-2026-\d{4}$`.
    - Der oprettes 2 `devices` med `status='intake'`, `vat_scheme='brugtmoms'`, `purchase_price=150000` og `location_id` = Vejle.
    - Der oprettes 2 `purchase_documents` med `trade_in_receipt_id` og 2 `stock_movements` med `reason='purchase'`, `qty_delta=1`.
    - `items.device_id` er sat, og sedlens `buyer_company` er `'Fixon ApS'`.
  - En tilsvarende Slagelse-seddel giver `SP-2026-0001` og `buyer_company='PhoneGo ApS'`.
  - En kladde på præcis 2.000 kr bekræftes uden ID.
  - En kladde med et IMEI, der findes på en `intake`-enhed, giver `imei_in_stock`. Er enheden `sold`, lykkes den.
  - `trade_in_void` på den bekræftede seddel uden begrundelse giver `void_reason_required`. Med begrundelse:
    - sættes `status='voided'`
    - enhederne bliver `status='delisted'` med `blocked_reason='Slutseddel annulleret'`
    - der skrives 2 `stock_movements` med `qty_delta=-1`, `reason='adjust'`
  - `trade_in_void` på en seddel, hvor en enhed ikke længere er `intake`, eller som er `paid`, giver `receipt_not_voidable`.

- [ ] **Step 2: Kør smoke-SQL'en, og se den fejle** (funktionen findes ikke)

- [ ] **Step 3: Skriv funktionerne**

`trade_in_confirm`:
- låser sedlen `FOR UPDATE` og validerer de samme regler som `confirmBlockers` (SQL er den endelige kontrol; 18+ kun for privat)
- tæller nummeret op i `slutseddel_counters` (`INSERT … ON CONFLICT DO UPDATE … RETURNING`) for `legal_entity_id` og året i Europe/Copenhagen
- snapshotter `buyer_company`, `buyer_cvr` og `buyer_address` fra `legal_entities`, med fallback til `locations.address`, undtagen for Esbjerg, som ingen adresse får
- opretter en `devices`-række pr. vare: `template_id`, `imei` eller `serial_number` efter identifier-typen, `grade` efter tabellen, `battery_health`, `storage`, `color`, `condition_notes`, `purchase_price` og `vat_scheme` efter tabellen i Global Constraints, `location_id`, `source='internal'`, `status='intake'`, `purchased_at=now()`
- opretter `purchase_documents` med `seller_name`, `seller_address` (adresse + postnr. og by), `document_date`, `item_description` ("model, lager, IMEI …"), `purchase_price`, `pdf_url` = `receipt_number` (stien sættes af Task 5), `brugtmoms_text` (privat: `"Købt fra privat — brugtmoms"`, firma: efter fakturatype) og `trade_in_receipt_id`
- opretter `stock_movements` og sætter `items.device_id`
- sætter til sidst `status='confirmed'`, `confirmed_at`, `confirmed_by`, `legal_entity_id`

IMEI-dublet: findes der en enhed med samme `imei` og `status NOT IN ('sold','shipped','picked_up')`, giver det `imei_in_stock`.

- [ ] **Step 4: Tilføj danske beskeder** i `errors.ts` for hver kode, med en test pr. kode. Eksempler: `imei_in_stock` → "IMEI'et findes allerede på en enhed på lager", `id_required` → "ID kræves, når opkøbet er over 2.000 kr."

- [ ] **Step 5: Kør migration og smoke-SQL, og kør `npx vitest run src/lib/pos/__tests__`**
Expected: smoke uden fejl. Tests PASS.

- [ ] **Step 6: Commit** — `feat(opkoeb): trade_in_confirm og trade_in_void`

---

### Task 4: API: kladder, liste og serveradgang

**Files:**
- Modify: `src/app/api/trade-in/receipts/route.ts` (GET-liste og POST-kladde), `src/app/api/trade-in/receipts/[id]/route.ts` (GET, PATCH, DELETE af kladde)
- Create: `src/lib/opkoeb/receipt-access.ts`
- Modify: `src/app/(admin)/admin/opkoeb/page.tsx`, `src/app/(admin)/admin/opkoeb/ko/page.tsx` og `src/app/(admin)/admin/opkoeb/[id]/page.tsx`. Alle `from("trade_in_receipts")` fra browser-klienten erstattes med `staffFetch("/api/trade-in/receipts?inquiry_ids=…")`.
- Test: `src/app/api/trade-in/__tests__/receipts-access.test.ts`

**Interfaces:**
- Consumes: `requirePosStaff`, `posErrorResponse` (`src/lib/pos/route-helpers.ts`), `assertLocationAccess` (`src/lib/pos/pos-context.ts`), `receiptDraftSchema`, `ID_REQUIRED_ABOVE_OERE`.
- Produces:
  - `loadReceiptForActor(actor: StaffIdentity, id: string): Promise<ReceiptRow>`. Giver 404 som `PosError`, hvis sedlen ikke findes. Har aktøren ikke adgang til butikken, giver den 404 til ikke-ejere (afslører ikke eksistens).
  - **`GET /api/trade-in/receipts`:**
    - `?inquiry_ids=a,b` (højst 200) returnerer `[{inquiry_id,status,total_amount,created_at,confirmed_at,paid_at}]`.
    - `?location_id=&status=&limit=` returnerer listen, filtreret til de butikker, aktøren har adgang til. Ejeren ser alle.
    - `?number=SS-2026-0001` returnerer højst én seddel (`id, receipt_number, status, total_amount, offset_amount, location_id`), kun i aktørens butikker. Den bruges af kassen i Task 10.
  - **`POST /api/trade-in/receipts`** tager `receiptDraftSchema` + `location_id`. Serveren:
    - tjekker `assertLocationAccess`
    - sætter `created_by = actor.id`
    - sætter `total_amount` som summen af varerne
    - sætter `lock_checks_by/at` og `id_checked_by/at` til aktøren og nu, når felterne er udfyldt
    - ignorerer `staff_initials`
  - **`PATCH /api/trade-in/receipts/[id]`** virker kun på kladder. Varerne erstattes helt.
  - **`DELETE`** virker kun på kladder.
  - Svarene indeholder aldrig `id_number`, når sedlen er låst. Det returneres maskeret (`••••1234`), så kun de sidste 4 tegn vises.

- [ ] **Step 1: Skriv fejlende tests** i stil med `src/app/api/pos/__tests__/receipt-terminal-scope.test.ts`, med falsk Supabase-builder og ægte `assertLocationAccess`:
  - En Vejle-medarbejder POST'er med Slagelses `location_id` og får 403.
  - En Vejle-medarbejder GET'er en Slagelse-seddel og får 404.
  - Ejeren GET'er den og får 200.
  - PATCH på en bekræftet seddel giver 409 `"Slutsedlen er bekræftet og kan ikke rettes"`.
  - Body med `id_number: "010190-1234"` giver 400.
  - Listen for en Vejle-medarbejder indeholder ingen Slagelse-rækker.

- [ ] **Step 2: Kør testene, og se dem fejle.** Run: `npx vitest run src/app/api/trade-in/__tests__/receipts-access.test.ts`

- [ ] **Step 3: Implementér ruterne, og flyt browser-læsningerne** i de tre opkøbssider til API'et. Siderne skal vise det samme som før.

- [ ] **Step 4: Kør testene og `npx tsc --noEmit`, og se dem bestå**

- [ ] **Step 5: Commit** — `feat(opkoeb): API for kladder med butiksadgang; slutsedler læses kun via server`

---

### Task 5: Slutseddel-PDF og bekræft

**Files:**
- Modify: `src/lib/pdf/slutseddel.tsx`, `src/app/api/trade-in/receipts/[id]/pdf/route.ts`, `src/app/api/trade-in/receipts/[id]/confirm/route.ts`
- Modify: `src/lib/supabase/trade-in-types.ts` (de nye kolonner)
- Modify: `src/app/(website)/privatlivspolitik/page.tsx` (find stien med Glob). Tilføj et afsnit om opkøb: hvad der gemmes (navn, adresse, kontakt, ID-type, -nummer og -udløb, konto), hvorfor (lov om handel med brugte genstande og bogføringsloven), og at ID-oplysninger slettes efter 5 år. Intet CPR.
- Test: `src/lib/pdf/__tests__/slutseddel.test.tsx`, `src/app/api/trade-in/__tests__/receipt-confirm.test.ts`

**Interfaces:**
- Consumes: `trade_in_confirm` (Task 3), `loadReceiptForActor` (Task 4), `resend` og `EMAIL_FROM` (`src/lib/email/resend.ts`).
- Produces:
  - `renderSlutseddelPdf(receipt: SlutseddelData): Promise<Buffer>` i `slutseddel.tsx`
  - **`POST /api/trade-in/receipts/[id]/confirm`:**
    1. Kald `rpc("trade_in_confirm", {p_receipt_id, p_staff_id: actor.id})`.
    2. Render PDF'en og upload til `slutsedler/{receipt_number}.pdf`. Bucketten er privat, så der bruges ingen `getPublicUrl`, og `pdf_url` gemmer stien.
    3. Hvis sælgeren har e-mail: send PDF'en via `after()` fra `next/server`, så svaret ikke venter. Afsender er `EMAIL_FROM`, emnet `Slutseddel {nummer}`.
    4. Svar `{receipt_number}`.
  - Den gamle interne `fetch` med `x-internal-key` fjernes. `pdf`-ruten bliver en almindelig personale-rute (`requirePosStaff` + `loadReceiptForActor`), der renderer direkte.

PDF'ens indhold er fastlagt af lovgrundlaget:
- titel "Slutseddel", nummer og dato
- købende selskab (navn, CVR, adresse) og butikkens navn
- medarbejderens navn
- sælger (navn, adresse, telefon). Ved firma: CVR og fakturatype.
- varelinjer: nr., model, lager, IMEI/serienr., stand, batteri og pris
- total
- teksten "Beløbet indeholder ikke moms."
- ID: type og maskeret nummer (`••••1234`) og udløb, eller "Ikke påkrævet (under 2.000 kr.)"
- udbetaling: bank med maskeret konto (`••••5678`) eller "Modregnes i køb"
- erklæringen: "Sælger bekræfter at være fyldt 18 år, at være ejer af enhederne, at de ikke er stjålne, pantsatte eller under afbetaling, og at Find My/iCloud er slået fra."
- underskriftslinjer for sælger og køber
- privatlivslinjen: "Vi gemmer dine oplysninger efter lov om handel med brugte genstande og bogføringsloven. ID-oplysninger slettes efter 5 år. Læs mere på phonespot.dk/privatlivspolitik."

PDF'en viser ingen moms og ingen Esbjerg-adresse.

- [ ] **Step 1: Skriv fejlende tests**
  - PDF-testen renderer en Slagelse-seddel og tjekker med `pdf-parse` eller ved at teste dataudtrækket, at teksten indeholder "PhoneGo ApS", "38688766", "••••1234" og "indeholder ikke moms", og at den ikke indeholder det fulde ID-nummer eller "25 %".
  - Med en Esbjerg-seddel indeholder teksten "Esbjerg" og ingen adresse.
  - Confirm-testen bekræfter, at RPC'en kaldes med `p_staff_id` = ekspedienten (ikke den, der er logget ind), at PDF'en uploades til stien, at en RPC-fejl `id_required` giver 409 med den danske besked, og at en anden butik giver 404.
- [ ] **Step 2: Kør testene, og se dem fejle**
- [ ] **Step 3: Implementér**
- [ ] **Step 4: Kør testene, og se dem bestå. Kør `npx tsc --noEmit`.**
- [ ] **Step 5: Commit** — `feat(opkoeb): lovlig slutseddel-PDF og bekræft via trade_in_confirm`

---

### Task 6: API: filer, udbetaling, mistanke og annullering

**Files:**
- Create: `src/app/api/trade-in/receipts/[id]/upload/route.ts`, `src/app/api/trade-in/receipts/[id]/files/[kind]/route.ts`, `src/app/api/trade-in/receipts/[id]/suspicion/route.ts`, `src/app/api/trade-in/receipts/[id]/void/route.ts`
- Modify: `src/app/api/trade-in/receipts/[id]/pay/route.ts`
- Test: `src/app/api/trade-in/__tests__/receipt-actions.test.ts`

**Interfaces:**
- Consumes: `loadReceiptForActor`, `payBlockers`, `payBodySchema`, `suspicionBodySchema`, `voidBodySchema`, `uploadKindSchema`, `trade_in_void`, `logActivity` (`src/lib/platform/activity-log.ts`).
- Produces:
  - **`POST [id]/upload`**, multipart med `kind` og `file`:
    - Tilladt: jpeg, png, heic og pdf, højst 10 MB.
    - Gemmes i `slutsedler/{receipt_number}/{kind}-{timestamp}.{ext}`, og stien sættes på den tilsvarende kolonne.
    - Kun på `confirmed` eller `paid`.
  - **`GET [id]/files/[kind]`** svarer 302 til en signeret URL med 60 sekunders levetid.
  - **`POST [id]/pay`** tager `{payout_method:"bank", seller_bank_reg, seller_bank_account, account_owner_confirmed:true}`. Er der `payBlockers`, gives 409 med den første besked. Ellers sættes `status='paid'`, `paid_at` og `paid_by`. `modregning` sættes kun af kassen (Task 10) og afvises her med 400.
  - **`POST [id]/suspicion`** tager `{note, police_notified: boolean}`:
    - sætter `suspected_*` og eventuelt `police_notified_at`
    - sætter `blocked_at`, `blocked_reason='Mistanke: '+note` og `status='delisted'` på alle sedlens enheder, der ikke er solgt
    - logger aktiviteten
  - **`DELETE [id]/suspicion`** er kun for ejeren, med `{note}`. Spærringen ophæves: `blocked_at=null`, og `status` sættes til `intake`, hvis den var `delisted`.
  - **`POST [id]/void`** tager `{reason}` og kalder `trade_in_void`.
  - Alle handlinger kører `logActivity` med `actor_id` = ekspedienten.

- [ ] **Step 1: Skriv fejlende tests**
  - pay uden scan giver 409 "Læg den underskrevne slutseddel op"
  - pay med scan, bank og flueben giver 200 og `paid_by` = ekspedienten
  - pay på en seddel under mistanke giver 409
  - suspicion spærrer to enheder (begge `update`-kald ses i mocken)
  - DELETE suspicion som medarbejder giver 403, som ejer 200
  - upload af `.exe` giver 400
  - `files` fra en anden butik giver 404
  - void uden reason giver 400
- [ ] **Step 2: Kør testene, og se dem fejle**
- [ ] **Step 3: Implementér**
- [ ] **Step 4: Kør testene, og se dem bestå. Kør `npx tsc --noEmit`.**
- [ ] **Step 5: Commit** — `feat(opkoeb): upload af underskrevet seddel, udbetaling, mistanke og annullering`

---

### Task 7: Prisforslag

**Files:**
- Create: `src/app/api/trade-in/price-suggestion/route.ts`, `src/lib/opkoeb/green-link.ts`
- Test: `src/lib/opkoeb/__tests__/green-link.test.ts`, `src/app/api/trade-in/__tests__/price-suggestion.test.ts`

**Interfaces:**
- Consumes: `estimateBuyback(client, device: BuybackDevice, condition: BuybackCondition, settings)` og `loadBuybackSettings` (`src/lib/buyback/`).
- Produces:
  - **`POST /api/trade-in/price-suggestion`** tager `{template_id, storage?, condition: "Perfekt"|"God"|"Acceptabel"|"Defekt", battery_health?, find_my_off: boolean}` og returnerer `{status:"ok"|"manual", aim_oere, floor_oere, manual_reason?, green_url}`.
    - Mapning til `BuybackCondition`: Perfekt/God giver ingen fejl. Acceptabel giver `back: "Ridser"`. Defekt giver `allWorking: "Nej"`. Batteri under 80 giver `battery: "Under 80%"`. `cloudLocked = find_my_off ? "Nej" : "Ja"`. Implementøren tjekker værdierne mod `fault-mapping.ts` og bruger de strenge, den kender.
  - `greenUrl(brand: string, model: string, storage?: string): string`. Implementøren tjekker Green.dk's søge-URL. Findes der ingen, bruges `https://www.green.dk/`.

- [ ] **Step 1: Skriv fejlende tests**
  - `greenUrl("Apple","iPhone 14","128 GB")` giver en https-URL på green.dk med URL-encodet model
  - ruten: `find_my_off:false` giver `status:"manual"`
  - en kendt model med mocket `estimateBuyback` giver `aim_oere` fra resultatet
- [ ] **Step 2: Kør testene, og se dem fejle**
- [ ] **Step 3: Implementér**
- [ ] **Step 4: Kør testene, og se dem bestå**
- [ ] **Step 5: Commit** — `feat(opkoeb): prisforslag fra opkøbsmotoren og link til Green.dk`

---

### Task 8: Opkøbs-editor (ny og fra henvendelse)

**Files:**
- Create: `src/app/(admin)/admin/opkoeb/slutsedler/ny/page.tsx`, `src/app/(admin)/admin/opkoeb/slutsedler/_components/receipt-editor.tsx`, `src/app/(admin)/admin/opkoeb/slutsedler/_components/item-row.tsx`
- Modify: `src/app/(admin)/admin/opkoeb/[id]/slutseddel/page.tsx`. Den erstattes af en redirect til `/admin/opkoeb/slutsedler/ny?inquiry=<id>`, eller til sedlen, hvis den findes.
- Modify: `src/app/(admin)/admin/kasse/_components/kasse-screen.tsx`. Tilføj knappen "Nyt opkøb", der åbner `/admin/opkoeb/slutsedler/ny?location=<kassens location_id>`.
- Test: `src/app/(admin)/admin/opkoeb/slutsedler/__tests__/receipt-editor.test.tsx`

**Interfaces:**
- Consumes: `POST/PATCH /api/trade-in/receipts`, `POST [id]/confirm`, `POST /api/trade-in/price-suggestion`, `GET /api/platform/templates?search=`, `/api/customers/cvr`, `confirmBlockers`, `normalizeIdentifier`, `idRequired`, `ID_TYPE_LABELS`.
- Produces: editoren `ReceiptEditor({ locationId, inquiryId? })`.

Layout, én side i denne rækkefølge:
1. **Enheder.** En række pr. enhed med:
   - IMEI/serienummer-felt med fokus ved sidens start; scanneren skriver i det
   - modelsøgning
   - lager, stand og batteri
   - forslag og endelig pris
   - note

   Under IMEI-feltet vises "Ugyldigt IMEI" med det samme. Prisforslaget hentes, når model og stand er valgt, og "Se Green.dk's pris" vises som link.
2. **Sælger:**
   - Valget privat/firma.
   - For privat: navn, adresse, postnr. og by, telefon og e-mail.
   - For firma: CVR-opslag, der udfylder navn og adresse, plus fakturatype.
3. **Tjek:**
   - fluebenet "Sælger er fyldt 18"
   - fluebenet "Find My/iCloud er slået fra, og enheden er ikke spærret eller meldt stjålet"
   - ID-felterne. De vises og er påkrævede, så snart totalen er over 2.000 kr.
   - hjælpeteksten "Skriv ikke CPR-nummer."
4. **Udbetaling:** bank med reg.nr., konto og fluebenet "Kontoen står i sælgers navn", eller "Modregnes i køb i kassen".
5. **Bunden:** total, listen med `confirmBlockers` og knappen "Bekræft og print". Den gemmer kladden, bekræfter og åbner PDF'en i en ny fane til print.

Andet:
- Fra en henvendelse udfyldes sælger, enheder, IMEI og bank, og `attestation='online_accept'`, hvis henvendelsen har et accepteret tilbud.
- Kladden gemmes automatisk (debounce 1 s), så en genindlæsning ikke taber noget.

- [ ] **Step 1: Skriv fejlende komponenttests** (testing-library, med mocket `staffFetch`):
  - Totalen 2.000 kr viser ingen ID-felter, men 2.000,01 kr gør.
  - Et ugyldigt IMEI viser "Ugyldigt IMEI".
  - "Bekræft og print" er deaktiveret, så længe `confirmBlockers` ikke er tom.
  - Et klik kalder POST og derefter confirm.
  - Valget firma viser fakturatype og CVR-opslag og skjuler 18+-fluebenet.
- [ ] **Step 2: Kør testene, og se dem fejle**
- [ ] **Step 3: Implementér.** Følg designreglerne i `docs/` (admin-designrammen fra 2026-09). Ingen emojis.
- [ ] **Step 4: Kør testene, og se dem bestå. Kør `npx tsc --noEmit`.**
- [ ] **Step 5: Commit** — `feat(opkoeb): opkøb fra disken med IMEI-scanning, ID-krav over 2.000 kr og print`

---

### Task 9: Slutsedler: liste og detalje

**Files:**
- Create: `src/app/(admin)/admin/opkoeb/slutsedler/page.tsx`, `src/app/(admin)/admin/opkoeb/slutsedler/[receiptId]/page.tsx`
- Modify: admin-navigationen (find den fil, der viser "Opkøb"). Tilføj underpunktet "Slutsedler" under Opkøb, ikke som en ny hovedsektion.
- Test: `src/app/(admin)/admin/opkoeb/slutsedler/__tests__/receipt-detail.test.tsx`

**Interfaces:**
- Consumes: alle ruter fra Task 4–6.
- Produces:
  - **Listen:** filtre for butik (kun dem, man har adgang til), status og "mangler scan". Kolonnerne er nummer, dato, butik, sælger, antal enheder, total, status og medarbejder.
  - **Detaljesiden** viser sedlen med maskeret ID og handlingerne:
    - "Print slutseddel"
    - "Læg underskrevet seddel op"; på mobil åbner den kameraet via `accept="image/*" capture`
    - "Marker som udbetalt"; deaktiveret med begrundelse fra `payBlockers`
    - "Mistanke om tyveri"; bekræftelse i egen dialog, ikke `window.confirm`
    - "Annullér slutseddel"
    - lagerenhederne med links til enhedssiden

- [ ] **Step 1: Skriv fejlende test**
  - Detaljesiden for en bekræftet privat seddel uden scan viser "Marker som udbetalt" som deaktiveret med teksten "Læg den underskrevne slutseddel op".
  - Efter et mocket upload er knappen aktiv.
  - Mistanke-dialogen kræver en note.
- [ ] **Step 2: Kør testen, og se den fejle**
- [ ] **Step 3: Implementér**
- [ ] **Step 4: Kør testen, og se den bestå. Kør `npx tsc --noEmit`.**
- [ ] **Step 5: Commit** — `feat(opkoeb): liste og detalje for slutsedler med upload, udbetaling og mistanke`

---

### Task 10: Kassen: modregning af opkøb, IMEI på bonen og spærrede enheder

**Files:**
- Create: `supabase/migrations/20261109122000_d2_pos_sale_opkoeb.sql`, `scripts/sql/d2-smoke-sale.sql`
- Modify: `src/lib/pos/constants.ts` (`PAYMENT_TYPES` + `"opkoeb"`, label "Modregnet opkøb"; ikke i `REFUND_TYPES`), `src/lib/pos/schemas.ts` (device-linjen får `imei: z.string().optional()`), `src/lib/pos/create-sale.ts` (giver `imei` videre i `p_items`), `src/lib/pos/dinero-mapping.ts` (`opkoeb: "opkoeb_afregning"` + nøglen `opkoeb_afregning: { label: "Afregning opkøb (modregnet i salg)", account: "[KONTO-OPKOEB-AFREGNING]" }`), `src/lib/pos/errors.ts`, `src/app/api/pos/lookup/route.ts` (enheder returnerer `imei`, `blocked: boolean` og `has_purchase_document: boolean`), `src/app/(admin)/admin/kasse/_components/dialogs.tsx` og `cart-panel.tsx`
- Test: `src/lib/pos/__tests__/daily-summary.test.ts` (tilføj et tilfælde), `src/app/api/pos/__tests__/sale-opkoeb.test.ts`, `src/app/(admin)/admin/kasse/__tests__/` (et nyt UI-tilfælde)

**Interfaces:**
- Consumes: `trade_in_receipts.offset_*`, `devices.blocked_at`, `order_items.imei` (Task 2).
- Produces: `pos_create_sale` med samme signatur. Tag den aktuelle definition fra prod med `select pg_get_functiondef('pos_create_sale'::regproc)`, ikke fra en gammel migrationsfil, og tilføj kun:
  - **Device-linjer:**
    - `d.blocked_at IS NOT NULL` giver `pos_fail('device_blocked', barcode)`.
    - Det IMEI, der gemmes, er `coalesce(d.imei, nullif(btrim(it.e->>'imei'),''))`.
    - Er `d.vat_scheme='brugtmoms'`, og er resultatet NULL, giver det `pos_fail('imei_required', barcode)`.
    - Har enheden IMEI, og afviger det medsendte, giver det `pos_fail('imei_mismatch', barcode)`.
    - Mangler enheden IMEI, sættes `devices.imei` til det medsendte.
    - IMEI skrives i `order_items.imei`.
  - **Betalingstypen `opkoeb`:**
    - `reference` = slutsedlens `receipt_number` er påkrævet.
    - Sedlen låses `FOR UPDATE`. Den skal have `status='confirmed'`, `location_id = p_location_id`, `offset_order_id IS NULL`, `suspected_at IS NULL` og en signeret scan, hvis `attestation='paper_scan'` og `seller_type='private'`, eller en faktura, hvis den er firma. Beløbet må højst være `total_amount`.
    - Fejlkoder: `trade_in_not_found`, `trade_in_not_settleable`, `trade_in_amount_too_high`.
    - Efter ordren er oprettet: `offset_order_id`, `offset_amount` og `payout_method='modregning'`. Er beløbet lig `total_amount`, sættes også `status='paid'`, `paid_at` og `paid_by=p_staff_id`.
    - Et restbeløb udbetales via bank på detaljesiden (Task 6). `payBlockers` skal tillade `offset_amount < total_amount` og beregne restbeløbet.
  - `order_payments_type_check` udvides med `'opkoeb'`.

Kassens UI:
- Betalingsmetoden "Modregn opkøb" har et felt til slutseddelsnummeret. Feltet viser sedlens total, når det er slået op via `GET /api/trade-in/receipts?number=` (Task 4).
- Når en brugtmoms-enhed uden IMEI lægges i kurven, spørger kassen om IMEI.
- En spærret enhed kan ikke lægges i kurven.
- Mangler en enhed indkøbsbilag (`has_purchase_document=false`), vises advarslen "Mangler indkøbsbilag", men salget blokeres ikke.

- [ ] **Step 1: Skriv smoke-SQL** (`BEGIN … ROLLBACK`). Opret en bekræftet Vejle-seddel på 3.000 kr med scan, og en enhed på Vejle til 5.000 kr. Kald `pos_create_sale` med betalingerne `opkoeb` 3.000 + `kontant` 2.000:
  - Salget lykkes. Sedlen er `paid` med `offset_order_id` = ordren, og `order_items.imei` er sat.
  - Et andet salg med samme reference giver `trade_in_not_settleable`.
  - En Slagelse-kasse med en Vejle-seddel giver `trade_in_not_settleable`.
  - En spærret enhed giver `device_blocked`.
  - En brugtmoms-enhed uden IMEI og uden medsendt IMEI giver `imei_required`.
- [ ] **Step 2: Skriv fejlende TS-tests**
  - `sale-opkoeb.test.ts`: zod accepterer `opkoeb` med reference og afviser den uden. Fejlkoderne giver danske beskeder.
  - `daily-summary.test.ts`: en ordre med `opkoeb` 300000 giver betalingslinjen `opkoeb` med net 300000, og den tælles ikke med i kontantbeholdningen.
- [ ] **Step 3: Kør, og se dem fejle**
- [ ] **Step 4: Implementér migrationen og TS/UI-ændringerne. Kør migrationen og smoke-SQL'en.**
- [ ] **Step 5: Kør testene, og se dem bestå:** `npx vitest run src/lib/pos src/app/api/pos "src/app/(admin)/admin/kasse"` og `npx tsc --noEmit`
- [ ] **Step 6: Commit** — `feat(kasse): modregn opkøb, IMEI på bonen og spærrede enheder`

---

## Efter sidste task

- Kør det endelige review. Merge og push til `main`, så Vercel deployer.
- Tjek med `vercel inspect`, at phonespot.dk peger på det nye deploy.
- Tjek live, at `/admin/opkoeb/slutsedler/ny` virker, og at en direkte forespørgsel med anon- eller authenticated-nøglen mod `trade_in_receipts` giver 0 rækker.
- Opdatér hukommelsesfilen for kassesystemet med D2-status.

## Åbent for ejeren (påvirker ikke byggeriet)

1. **Opkøb fra hjemmesiden over 2.000 kr.** kræver efter loven MitID-verifikation. Indtil der er MitID, kan sådan et opkøb ikke bekræftes, medmindre sælgeren viser ID. Skal MitID være et selvstændigt projekt?
2. **PhoneGos adresse** på slutsedler fra Slagelse. Indtil den kendes, bruges Slagelse-butikkens adresse.
3. **Automatisk Green.dk-pris** kræver et tjek af deres vilkår først.
4. **`trade_in_offers`** gemmer også bankoplysninger og har sandsynligvis samme åbne adgang ("Authenticated full access"). Det skal undersøges og lukkes i en lille opfølgning efter D2.

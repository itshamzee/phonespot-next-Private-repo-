# D1: Butikker, juridisk enhed, pinkode og tilladelser — implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kassen kender alle fem butikker. Bilag viser butikkens egen juridiske enhed. Medarbejdere skifter ekspedient med pinkode, har tilladelser pr. person, og serveren afgør butik og kasse.

**Architecture:**
- Butikkernes juridiske enhed ligger i en ny tabel `legal_entities`, som `locations.legal_entity_id` peger på. Ordrer får et snapshot af enheden ved oprettelse via en `BEFORE INSERT`-trigger, så gamle bilag aldrig ændrer sig.
- Ekspedienten bæres i en signeret, httpOnly cookie (`ps_operator`), sat efter pinkode. Alle `/api/pos/*` finder den handlende medarbejder via én hjælper.
- Butik og kasse udledes på serveren fra kassen, og adgang tjekkes med de eksisterende `store-scope`-regler.

**Tech Stack:** Next.js App Router, Supabase Postgres (migrationer køres med `node scripts/apply-migration.mjs <fil>`), zod, vitest, node:crypto (scrypt, HMAC). Ingen nye afhængigheder.

**Spec:** `docs/superpowers/specs/2026-11-06-kassesystem-fixon-design.md` (afsnit D1, og den juridiske enhed pr. butik).

## Global Constraints

- **Juridiske enheder:** Fixon ApS, CVR 46079019, momsnr. DK46079019 (Webshop, Vejle, Vejle Gågade, Esbjerg). PhoneGo ApS, CVR 38688766 (Slagelse).
- **Hjemmesiden** viser kun Fixon (`LEGAL_ENTITY` i `src/lib/company.ts`). PhoneGo må kun stå på bilag fra Slagelse: kassebon, faktura, slutseddel og reparationskvittering.
- **Esbjerg:** adressen må aldrig vises offentligt. Esbjerg og Vejle Gågade tilføjes kun til admin og kasse (`ScopeSlug`), ikke til `StoreId`/`STORES`, som er kundevendte.
- **Slugs:** `vejle-gaagade` og `esbjerg`. Labels: "Vejle Gågade" og "Esbjerg".
- **Pinkode:** 4–6 cifre (`/^\d{4,6}$/`), gemt som scrypt-hash. Efter 5 forkerte forsøg låses den i 15 minutter. Ekspedient-cookien gælder 12 timer.
- **Rettelser af bilag:** bogførte rækker ændres aldrig. Nye kolonner tilføjes kun.
- **Sprog:** UI-tekst på dansk, sentence case, DM Sans, ingen emojis.
- **Migrationer:** køres i prod af implementøren (`node scripts/apply-migration.mjs`) og verificeres med en forespørgsel bagefter.
- **Tests:** De 10 tests, der allerede fejler på main (middleware, booking-wizard, repair-cart, device-detail, repairs-routes, google-shopping-feed, reparation/priser, repairs status), er ikke denne plans ansvar. Der må ikke komme nye fejl.

## Review Focus

1. **Gamle bilag.** En bon for en ordre fra før denne plan skal printes præcis som før, med "CVR: 44588819" og uden firmanavn. Testes i Task 3.
2. **Deaktiveret ekspedient.** Hvis en medarbejder deaktiveres efter pinkode-skiftet, må cookien ikke længere virke. Kassen falder tilbage til den medarbejder, der er logget ind. Testes i Task 5.
3. **Ekspedient fra en anden butik.** En ekspedient, der skifter ind på en kasse i en butik, vedkommende ikke hører til, skal afvises med 403, også selvom den medarbejder, der er logget ind, hører til butikken. Testes i Task 6.
4. **Gamle klienter.** En åben kasse-fane, der stadig sender `locationId` i body, og som ikke matcher kassen, må ikke kunne bogføre på en anden butik. Serveren ignorerer feltet. Testes i Task 6.
5. **Gætteri af pinkode.** Det 6. forsøg inden for låsetiden afvises, også med den rigtige kode. Svaret må ikke afsløre, om medarbejderen findes. Testes i Task 5.

---

### Task 1: Migration — juridiske enheder, nye butikker, pinkode- og tilladelseskolonner

**Files:**
- Create: `supabase/migrations/20261106120000_d1_legal_entities_stores_staff.sql`

**Interfaces:**
- Produces:
  - tabellen `legal_entities(id uuid pk, name text not null, cvr text not null unique, vat_id text, created_at timestamptz)`
  - `locations.legal_entity_id uuid references legal_entities`
  - nye `locations`-rækker `vejle-gaagade` og `esbjerg` med `type='store'`
  - `registers` med koden `G1` (Vejle Gågade, "Kasse 1") og `E1` (Esbjerg, "Kasse 1") og `active=true`
  - `staff.pin_hash text`, `staff.pin_failed_attempts int not null default 0`, `staff.pin_locked_until timestamptz` og `staff.permissions text[] not null default '{}'`
  - `orders.legal_name text` og `orders.legal_cvr text`
  - triggerfunktionen `public.orders_snapshot_legal_entity()` (`BEFORE INSERT`): hvis `NEW.legal_cvr` er null og `NEW.location_id` har en enhed, sættes navn og CVR fra den

- [ ] **Step 1: Skriv migrationen.** Seed to enheder (Fixon og PhoneGo med værdierne fra Global Constraints). Sæt `legal_entity_id` for `slagelse` til PhoneGo og for `vejle`, `webshop`, `vejle-gaagade` og `esbjerg` til Fixon. Indsæt de nye butikker og kasser idempotent (`ON CONFLICT`/`WHERE NOT EXISTS` på slug og kode). Tjek `registers`-kolonnerne i `20261003120000_pos_foundation_tables.sql` for påkrævede felter. Eksisterende ordrer får **ikke** udfyldt snapshot (de forbliver NULL).
- [ ] **Step 2: Kør migrationen i prod.**
  Run: `node scripts/apply-migration.mjs 20261106120000_d1_legal_entities_stores_staff.sql`
  Expected: `HTTP 201`
- [ ] **Step 3: Verificér.**
  Run: `node scripts/apply-migration.mjs --query "select l.slug, e.name, e.cvr, (select string_agg(code, ',') from registers r where r.location_id=l.id) from locations l left join legal_entities e on e.id=l.legal_entity_id order by slug"`
  Expected: 5 rækker. `slagelse` står med PhoneGo ApS og 38688766. De andre fire står med Fixon ApS og 46079019. `esbjerg` har E1, og `vejle-gaagade` har G1.
- [ ] **Step 4: Commit**
  ```bash
  git add supabase/migrations/20261106120000_d1_legal_entities_stores_staff.sql
  git commit -m "feat(db): juridiske enheder pr. butik, Vejle Gågade og Esbjerg, pinkode- og tilladelseskolonner"
  ```

### Task 2: Store scope kender de nye butikker

**Files:**
- Modify: `src/lib/auth/store-scope.ts` (`ScopeSlug`, `SCOPE_SLUGS`, `SCOPE_LABELS`, `deriveLocationSlug`)
- Test: `src/lib/auth/__tests__/store-scope.test.ts`

**Interfaces:**
- Produces: `type ScopeSlug = "vejle" | "slagelse" | "webshop" | "vejle-gaagade" | "esbjerg"`. `SCOPE_LABELS["vejle-gaagade"] === "Vejle Gågade"`. `storeForNewRecord` er uændret og returnerer kun `"vejle" | "slagelse"`, fordi reparationssagernes `store_id` er kundevendt `StoreId`.

- [ ] **Step 1: Skriv de fejlende tests.**
  - `normalizeScopeSlug("Vejle-Gaagade ") === "vejle-gaagade"`
  - `canAccessStore({role:"employee", location_slug:"esbjerg"}, "esbjerg") === true`
  - `canAccessStore({role:"employee", location_slug:"esbjerg"}, "vejle") === false`
  - `deriveLocationSlug({id:"x", name:"Vejle Gågade", slug:null}) === "vejle-gaagade"`
  - `storeForNewRecord({role:"employee", location_slug:"esbjerg"}, "esbjerg") === null`
- [ ] **Step 2: Kør testene.** `npx vitest run src/lib/auth/__tests__/store-scope.test.ts`. Expected: FAIL på de nye cases.
- [ ] **Step 3: Udvid typerne og labels.** `deriveLocationSlug` mapper navnene "vejle gågade" og "esbjerg".
- [ ] **Step 4: Kør igen og typetjek.**
  - `npx vitest run src/lib/auth && npx tsc --noEmit -p . 2>&1 | grep -v "^\.next"`. Expected: PASS og 0 typefejl.
  - Typefejl i `Record<ScopeSlug, …>`-objekter (fx labels i UI) rettes ved at tilføje de nye nøgler.
- [ ] **Step 5: Commit** — `feat(scope): Vejle Gågade og Esbjerg i admin- og kasse-scope`

### Task 3: Juridisk enhed pr. butik på bilag

**Files:**
- Create: `src/lib/legal-entity-server.ts`
- Modify: `src/lib/pos/receipt-data.ts`, `src/lib/pos/receipt-pdf.tsx:225-227`, `src/app/(admin)/admin/platform/orders/[id]/faktura/page.tsx:178-179,270`, `src/app/(admin)/admin/opkoeb/[id]/slutseddel/page.tsx:116-117`, `src/lib/pdf/intake-receipt.tsx:618` og den route, der renderer den: `src/app/api/pdf/intake-receipt/[ticketId]/route.ts`
- Test: `src/lib/__tests__/legal-entity-server.test.ts`, `src/lib/pos/__tests__/receipt-legal.test.ts`

**Interfaces:**
- Produces:
  - `type LegalEntityInfo = { name: string; cvr: string }`
  - `legalEntityForLocation(locationId: string | null): Promise<LegalEntityInfo>`: slår op i `locations → legal_entities` og falder tilbage til `LEGAL_ENTITY`
  - `legalEntityForStoreSlug(slug: string | null): Promise<LegalEntityInfo>`: til reparationssager, hvor `store_id` er en tekst-slug
  - `receiptLegalLine(order: { legal_name: string | null; legal_cvr: string | null }): string`: `"Fixon ApS · CVR: 46079019"`, eller `"CVR: 44588819"` når begge er null. Det er den uændrede tekst på gamle bonner.
  - Bon-props får `legalLine: string` i stedet for den hårdkodede CVR.

- [ ] **Step 1: Skriv de fejlende tests.**
  - `receiptLegalLine({legal_name:null, legal_cvr:null}) === "CVR: 44588819"`
  - `receiptLegalLine({legal_name:"PhoneGo ApS", legal_cvr:"38688766"}) === "PhoneGo ApS · CVR: 38688766"`
  - `legalEntityForLocation(null)` resolver til `{ name:"Fixon ApS", cvr:"46079019" }`
  - Med mocket supabase, der returnerer PhoneGo for Slagelse-id'et, resolver den til PhoneGo.
  - Hvis opslaget fejler, falder den tilbage til Fixon. Den kaster ikke.
- [ ] **Step 2: Kør testene.** Expected: FAIL (modulet findes ikke).
- [ ] **Step 3: Implementér modulet og brug det.**
  - **Bon:** `receipt-data.ts` læser `orders.legal_name` og `orders.legal_cvr` og sender `legalLine` videre.
  - **Faktura:** bruger ordrens snapshot via `receiptLegalLine`. Firmalinjen bliver "PhoneSpot / {name}".
  - **Slutseddel:** standardværdien for køber kommer fra `legalEntityForLocation(staff.location_id)` via `/api/admin/me` eller en prop. Den ansatte kan stadig rette feltet.
  - **Reparationskvittering:** bruger `legalEntityForStoreSlug(ticket.store_id)`.
- [ ] **Step 4: Kør tests og typetjek.**
  - Run: `npx vitest run src/lib src/app/api/pos && npx tsc --noEmit -p . 2>&1 | grep -v "^\.next"`
  - Expected: PASS. De eneste fejl er dem, der allerede var der.
- [ ] **Step 5: Live-tjek efter deploy.** Lav en testordre i Slagelses kasse. Bonnen viser "PhoneGo ApS · CVR: 38688766". Genprint en bon fra før deployet: den viser "CVR: 44588819".
- [ ] **Step 6: Commit** — `feat(bilag): bon, faktura, slutseddel og reparationskvittering viser butikkens juridiske enhed`

### Task 4: Tilladelser pr. medarbejder

**Files:**
- Create: `src/lib/auth/permissions.ts`
- Modify: `src/lib/auth/require-staff.ts` (`StaffIdentity.permissions`, select `permissions`), `src/app/api/pos/return/route.ts`, `src/app/api/pos/session/route.ts` (handlingen close), `src/app/api/pos/daily-summary/route.ts` (format csv/pdf), `src/app/api/export/transactions/route.ts`
- Test: `src/lib/auth/__tests__/permissions.test.ts` og nye cases i `src/app/api/pos/__tests__/sale-return.test.ts` og `cashup-session.test.ts`

**Interfaces:**
- Produces:
  - `const PERMISSIONS = ["se_indkoebspris","se_andre_butikkers_omsaetning","rette_priser","give_rabat","lave_retur","lukke_dagen","se_statistik","eksportere"] as const`
  - `type Permission = typeof PERMISSIONS[number]`
  - `PERMISSION_LABELS: Record<Permission,string>` (dansk, sentence case)
  - `ROLE_DEFAULTS: Record<string, Permission[]>`. `employee` og `manager` får `["lave_retur","lukke_dagen","give_rabat"]`, hvilket bevarer dagens adfærd. `intern` får `[]`. `owner` håndteres i `hasPermission`.
  - `hasPermission(staff: { role: string; permissions?: readonly string[] | null }, p: Permission): boolean`. `owner` returnerer altid true. Ellers gælder rollens standard ∪ `staff.permissions`.
  - `StaffIdentity.permissions: Permission[]`. Ukendte strenge fra databasen filtreres fra.
  - Håndhæves i D1:
    - `lave_retur` på `POST /api/pos/return`
    - `lukke_dagen` på `POST /api/pos/session` med `action:"close"`
    - `eksportere` på CSV/PDF i daily-summary og på transaktionseksporten. Transaktionseksporten kræver desuden fortsat ejer.
  - Resten håndhæves i senere delprojekter.

- [ ] **Step 1: Skriv de fejlende tests.**
  - `hasPermission({role:"owner"}, "eksportere") === true`
  - `hasPermission({role:"employee"}, "lave_retur") === true`
  - `hasPermission({role:"employee"}, "eksportere") === false`
  - `hasPermission({role:"employee", permissions:["eksportere"]}, "eksportere") === true`
  - `hasPermission({role:"intern"}, "lave_retur") === false`
  - Routes: en intern får 403 på `POST /api/pos/return` med beskeden "Du har ikke tilladelse til at lave retur".
- [ ] **Step 2: Kør testene.** Expected: FAIL.
- [ ] **Step 3: Implementér.** Tilføj `FORBIDDEN`-svaret med dansk besked i hver route efter `requireStaff`, eller efter `requirePosStaff`, når Task 5 er lavet. Brug den handlende medarbejder.
- [ ] **Step 4: Kør igen.** `npx vitest run src/lib/auth src/app/api/pos`. Expected: PASS. Eksisterende kasse-tests består stadig.
- [ ] **Step 5: Commit** — `feat(auth): tilladelser pr. medarbejder med rollestandarder`

### Task 5: Pinkode og ekspedientskift

**Files:**
- Create: `src/lib/auth/pin.ts`, `src/lib/auth/operator.ts`, `src/app/api/pos/operator/route.ts`
- Modify: `src/lib/pos/route-helpers.ts` (ny `requirePosStaff`), alle `src/app/api/pos/**/route.ts` (skift `requireStaff` til `requirePosStaff`), `src/app/api/admin/staff/route.ts` (PATCH tager `pin`), `src/app/api/admin/me/route.ts` (medarbejderen sætter sin egen pinkode)
- Test: `src/lib/auth/__tests__/pin.test.ts`, `src/lib/auth/__tests__/operator.test.ts`, `src/app/api/pos/__tests__/operator-route.test.ts`

**Interfaces:**
- Produces:
  - `isValidPin(pin: string): boolean`
  - `hashPin(pin: string): string`. Formatet er `scrypt$<salt b64>$<hash b64>`, med en tilfældig salt på 16 byte og keylen 32.
  - `verifyPin(pin: string, stored: string | null): boolean`. Den sammenligner i konstant tid.
  - `OPERATOR_COOKIE = "ps_operator"` og `OPERATOR_TTL_MS = 12*60*60*1000`
  - `signOperator(staffId: string, nowMs: number, secret: string): string`
  - `readOperator(value: string | undefined, nowMs: number, secret: string): { staffId: string } | null`. Den returnerer null ved forkert signatur, udløbet cookie eller fejlformat.
  - `requirePosStaff(request): Promise<{ loggedIn: StaffIdentity; actor: StaffIdentity } | null>`:
    - `actor` er ekspedienten fra cookien, hvis den er gyldig og medarbejderen stadig er aktiv. Ellers er `actor` lig `loggedIn`.
    - Returnerer null, hvis ingen er logget ind.
    - Alle POS-routes bruger `actor.id` som `staffId` og `actor` til tilladelser.
  - `GET /api/pos/operator?location_id=` returnerer `{ current: {id,name}, staff: Array<{id,name,hasPin}> }`. Listen indeholder aktive medarbejdere, der må bruge butikken; ejere er altid med.
  - `POST /api/pos/operator {staffId, pin}` sætter cookien og svarer `{ current }`.
    - Ved forkert kode: `401 {error:"Forkert pinkode"}`, og `pin_failed_attempts` tælles op.
    - Det 5. forkerte forsøg sætter `pin_locked_until = now()+15 min`.
    - Mens koden er låst: `423 {error:"Pinkoden er låst i 15 minutter"}`.
    - Medarbejderen findes ikke, eller har ingen pinkode: samme 401 som ved forkert kode.
    - Ved korrekt kode nulstilles tælleren.
  - `DELETE /api/pos/operator` sletter cookien.
  - **Lagring (ruling efter Task 1):** pinkoden ligger i `public.staff_pins(staff_id pk → staff.id, pin_hash, failed_attempts, locked_until, updated_at)` med RLS uden policies. Den ligger ikke på `staff`. `pin_failed_attempts` og `pin_locked_until` ovenfor betyder `staff_pins.failed_attempts` og `staff_pins.locked_until`. Tabellen må kun tilgås fra serveren med service role.
  - Hemmeligheden ligger i env `OPERATOR_COOKIE_SECRET`. Hvis den mangler, svarer POST `500 "Pinkode-skift er ikke sat op"`, og `requirePosStaff` ignorerer cookien.

- [ ] **Step 1: Skriv de fejlende tests.**
  - `verifyPin("1234", hashPin("1234"))` er true. `verifyPin("1235", hashPin("1234"))` er false. `isValidPin("123")` og `isValidPin("12a4")` er false.
  - `readOperator(signOperator("s1", t, k), t + OPERATOR_TTL_MS - 1, k)` giver `{staffId:"s1"}`.
  - Samme cookie ved `t + OPERATOR_TTL_MS + 1` giver null. Med en anden hemmelighed giver den null.
  - Route:
    - 5 forkerte forsøg giver fire gange 401 og så 423. Det 6. forsøg med den rigtige kode giver stadig 423.
    - En ukendt `staffId` giver 401 med samme besked som ved forkert kode.
    - Når `requirePosStaff` får en cookie for en medarbejder, der nu har `is_active=false`, returnerer den `actor === loggedIn`.
- [ ] **Step 2: Kør testene.** Expected: FAIL.
- [ ] **Step 3: Implementér modulerne og routen, og skift POS-routes til `requirePosStaff`.**
  - Cookien sættes med `httpOnly`, `secure`, `sameSite:"strict"`, `path:"/"` og `maxAge` lig TTL.
  - Opdatér mocks i de eksisterende POS-tests, så `requirePosStaff` mockes på samme måde som `requireStaff`.
- [ ] **Step 4: Kør igen.** `npx vitest run src/lib/auth src/app/api/pos`. Expected: PASS.
- [ ] **Step 5: Sæt hemmeligheden i prod.**
  - Kør `openssl rand -base64 32` og læg resultatet i `npx vercel env add OPERATOR_COOKIE_SECRET production` fra `phonespot-next/` (den linkede mappe).
  - Læg samme værdi i `.env.local` til lokal udvikling.
- [ ] **Step 6: Commit** — `feat(kasse): pinkode og ekspedientskift med låsning efter 5 forsøg`

### Task 6: Serveren afgør butik og kasse

**Files:**
- Create: `src/lib/pos/pos-context.ts`, `src/app/api/pos/locations/route.ts`
- Modify:
  - `src/lib/pos/schemas.ts` (`locationId` bliver valgfri og ignoreres i sale/return)
  - `src/app/api/pos/sale/route.ts`, `return/route.ts`, `session/route.ts`, `quick-tiles/route.ts`, `lookup/route.ts`, `cashup/route.ts`, `daily-summary/route.ts`, `stock-adjust/route.ts`
- Test: `src/lib/pos/__tests__/pos-context.test.ts` og nye cases i `sale-return.test.ts` og `cashup-session.test.ts`

**Interfaces:**
- Consumes: `requirePosStaff` (Task 5), `canAccessStore` og `buildLocationIndex` (Task 2)
- Produces:
  - `resolveRegister(actor: StaffIdentity, registerId: string): Promise<{ registerId: string; locationId: string; locationSlug: ScopeSlug }>`. Den kaster `PosError("register_not_found", …, 404)`, eller `PosError("store_forbidden", "Du har ikke adgang til denne butik.", 403)`, når `!canAccessStore(actor, slug)`.
  - `assertLocationAccess(actor: StaffIdentity, locationId: string): Promise<ScopeSlug>`. Den kaster samme 403.
  - Kun ejeren må kalde daily-summary og cashup uden `location_id` og `register_id`. Andre får 403.
  - `lookup` uden `location_id` er tilladt, fordi medarbejdere må se lageret i de andre butikker.
  - `GET /api/pos/locations` returnerer `{ locations: Array<{ id, slug, name, registers: Array<{id, code, name}> }> }`. Listen indeholder kun de butikker (`type='store'`), medarbejderen må bruge. Ejeren får alle.

- [ ] **Step 1: Skriv de fejlende tests.**
  - En medarbejder fra Vejle bogfører et salg på `registerId` for S1 (Slagelse). Svaret er 403, og RPC'en kaldes ikke.
  - En medarbejder fra Vejle sender `registerId` V1 og `locationId` lig Slagelses id. RPC'en kaldes med `p_location_id` lig Vejles id.
  - Den loggede medarbejder er fra Vejle, og ekspedienten fra cookien er fra Slagelse. Et salg på V1 giver 403, fordi ekspedienten afgør adgangen.
  - En ikke-ejer kalder `GET /api/pos/daily-summary` uden location og register og får 403.
  - Ejeren uden `location_id` kan bogføre på alle kasser.
- [ ] **Step 2: Kør testene.** Expected: FAIL.
- [ ] **Step 3: Implementér og indsæt kaldet i hver route.** Tilføj `store_forbidden` til `CATALOG` i `src/lib/pos/errors.ts`.
- [ ] **Step 4: Kør igen.** `npx vitest run src/lib/pos src/app/api/pos && npx tsc --noEmit -p . 2>&1 | grep -v "^\.next"`. Expected: PASS og 0 typefejl.
- [ ] **Step 5: Commit** — `fix(kasse): serveren afgør butik og kasse og tjekker adgang`

### Task 7: Kassen: ekspedient og butikker fra serveren

**Files:**
- Create: `src/app/(admin)/admin/kasse/_components/operator-switch.tsx`
- Modify: `src/app/(admin)/admin/kasse/_components/kasse-screen.tsx:175-213`: butikker hentes fra `/api/pos/locations` i stedet for browserens supabase-forespørgsel, og ekspedient-chippen vises i topbjælken.
- Test: `src/app/(admin)/admin/kasse/__tests__/operator-switch.test.tsx`

**Interfaces:**
- Consumes: `GET`/`POST`/`DELETE /api/pos/operator` (Task 5) og `GET /api/pos/locations` (Task 6)
- **Ruling efter Task 5:** `POST /api/pos/operator` tager `{staffId, pin, locationId}`. Låsebeskederne kan være "Pinkoden er låst i 15 minutter", "Pinkoden er låst i 30 minutter" eller "Pinkoden er låst. Bed ejeren om at sætte en ny pinkode", og alle tre vises som de er. Et `403` fra GET betyder "ingen adgang til butikken".
- Produces: `<OperatorSwitch locationId={string} onChanged={(current:{id:string;name:string}) => void} />`
  - Chippen viser "Ekspedient: {navn}". Et klik åbner en dialog med listen af medarbejdere (dem uden pinkode er grå med "Ingen pinkode").
  - Efter valg af navn kommer et taltastatur. Koden kan også tastes på det fysiske tastatur, og Enter sender den.
  - Fejlbeskeder fra serveren vises under feltet.
  - Knappen "Tilbage til {logget ind navn}" kalder `DELETE`.

- [ ] **Step 1: Skriv de fejlende tests** (testing-library, mocket fetch).
  - Når man vælger "Mads" og taster 1234 + Enter, kaldes `POST /api/pos/operator` med `{staffId, pin:"1234"}`, og chippen viser "Ekspedient: Mads".
  - Et 401-svar viser "Forkert pinkode", og feltet tømmes.
  - Et 423-svar viser låsebeskeden, og tastaturet slås fra.
- [ ] **Step 2: Kør testene.** Expected: FAIL.
- [ ] **Step 3: Implementér komponenten og kobl den på kassen.** Følg kassens eksisterende styling (Tailwind-farver fra `kasse-screen.tsx`, fx `#5E6A63`). Ingen emojis.
- [ ] **Step 4: Kør testene igen og prøv kassen lokalt.**
  - `npx vitest run "src/app/(admin)/admin/kasse"`. Expected: PASS.
  - Kør `npm run dev`, åbn `/admin/kasse`, skift ekspedient med pinkode, lav et kontantsalg, og se at bonen viser ekspedientens navn.
- [ ] **Step 5: Commit** — `feat(kasse): ekspedientskift med pinkode og butikker fra serveren`

### Task 8: Medarbejdere: butik, pinkode og tilladelser i admin

**Files:**
- Modify: `src/app/api/admin/staff/route.ts`, `src/app/(admin)/admin/indstillinger/medarbejdere/page.tsx`, `src/app/(admin)/admin/indstillinger/profil/page.tsx`
- Test: `src/lib/auth/__tests__/staff-admin.test.ts` (nye cases)

**Interfaces:**
- Consumes: `PERMISSIONS`, `PERMISSION_LABELS` og `ROLE_DEFAULTS` (Task 4), `hashPin` og `isValidPin` (Task 5), og `SCOPE_SLUGS` (Task 2)
- Produces:
  - `GET /api/admin/staff` returnerer pr. medarbejder `permissions: Permission[]` og `hasPin: boolean` (findes der en række i `staff_pins`?). Selve hashen sendes aldrig.
  - `PATCH` tager `{ permissions?: Permission[]; pin?: string | null }`. Pinkoden skrives som upsert i `staff_pins` og nulstiller `failed_attempts`; `null` sletter rækken. En ugyldig pinkode giver 400 "Pinkoden skal være 4–6 cifre". `null` fjerner pinkoden. Ukendte tilladelser giver 400.
  - `POST` og `PATCH` accepterer `location_slug` blandt alle 5 slugs.
  - Profil: medarbejderen kan sætte sin egen pinkode via `/api/admin/me` (Task 5).

- [ ] **Step 1: Skriv de fejlende tests.**
  - En PATCH med `pin:"12"` giver 400.
  - En PATCH med `pin:"4821"` gemmer en hash, der starter med `scrypt$`, og GET viser `hasPin:true` uden hashen.
  - En PATCH med `permissions:["eksportere","flyve"]` giver 400.
  - En PATCH fra en ikke-ejer giver 403. Det er den eksisterende regel, som skal bevares.
- [ ] **Step 2: Kør testene.** Expected: FAIL.
- [ ] **Step 3: Implementér API og UI.**
  - Under hver medarbejder kommer en sektion "Tilladelser" med afkrydsningsfelter. Rollens standardrettigheder vises som valgt og kan ikke vælges fra, med teksten "Følger rollen".
  - Der kommer et felt "Pinkode" med knapperne "Sæt" og "Fjern".
  - Butiksvalget viser alle 5 butikker.
- [ ] **Step 4: Kør igen.** `npx vitest run src/lib/auth && npx tsc --noEmit -p . 2>&1 | grep -v "^\.next"`. Expected: PASS.
- [ ] **Step 5: Commit, push og live-tjek.**
  - Push til main, så Vercel deployer.
  - Sæt en pinkode for en testmedarbejder på `/admin/indstillinger/medarbejdere`, skift til vedkommende i kassen, og tjek at returknappen giver 403 for en intern.
  - Commit: `feat(admin): butik, pinkode og tilladelser pr. medarbejder`

# Admin Sagsbehandlingssystem — Design

## Overblik

Erstatning for C1ST. Et komplet sagsbehandlingssystem til PhoneSpot bygget ind i det eksisterende Next.js admin-panel med Supabase som database. Systemet haandterer indlevering af reparationer (walk-in og online booking), kundehåndtering, SMS-notifikationer, Shopify POS-betaling og haandtering af henvendelser fra hjemmesiden.

## Arkitektur

**Tilgang:** Byg videre paa eksisterende Next.js admin-panel (`/admin`) med Supabase.

- Frontend: Next.js App Router (eksisterende admin route group)
- Database: Supabase (PostgreSQL + RLS)
- Auth: Supabase Auth (allerede implementeret)
- SMS: GatewayAPI (dansk udbyder, ~0,29 kr/SMS)
- Betaling: Shopify Admin API (Draft Orders) + Shopify POS + Shopify Checkout (Klarna, kort, MobilePay)
- PDF: @react-pdf/renderer (indleveringsbevis + vaerkstedsrapport)
- Email: Resend (allerede implementeret)
- Fil-upload: Supabase Storage (fotos)

## Faseopdeling

### Fase 1 (denne plan)
- Kundeoprettelse (privat/erhverv)
- Indlevering med tjekliste, fotos, bevis + vaerkstedsrapport
- Flere enheder og reparationer per kunde
- SMS-notifikationer (GatewayAPI)
- Statusflow og sagshåndtering
- Shopify POS-integration (Draft Orders + webhooks)
- Online betaling (betalingslink via Shopify Invoice, Klarna)
- Kontakthenvendelser i admin
- Interne noter paa sager
- Check-in/check-out fotos

### Fase 2 (fremtidig)
- Lagerstyring af reservedele
- Garantihåndtering (link til tidligere sager)
- Statistik og rapporter
- Kundeportal (online tracking)
- Automatiske paamindelser (afventende afhentning)

## Datamodel

### customers (NY)
```sql
create table customers (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('privat', 'erhverv')),
  name text not null,
  email text,
  phone text not null,
  company_name text,        -- kun erhverv
  cvr text,                 -- kun erhverv
  created_at timestamptz default now()
);
```

### customer_devices (NY)
```sql
create table customer_devices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  brand text not null,
  model text not null,
  serial_number text,
  color text,
  condition_notes text,
  photos jsonb default '[]',  -- array af Supabase Storage URLs
  created_at timestamptz default now()
);
```

### repair_tickets (OPDATERET)
```sql
-- Eksisterende tabel udvides:
alter table repair_tickets
  add column customer_id uuid references customers(id),
  add column device_id uuid references customer_devices(id),
  add column services jsonb,              -- [{id, name, price_dkk}]
  add column internal_notes jsonb default '[]',  -- [{text, author, timestamp}]
  add column intake_checklist jsonb,      -- tjekliste ved indlevering
  add column intake_photos jsonb default '[]',
  add column checkout_photos jsonb default '[]',
  add column shopify_draft_order_id text,
  add column shopify_order_id text,
  add column paid boolean default false,
  add column paid_at timestamptz;

-- Ny status tilfojet: 'diagnostik'
-- Flow: modtaget -> diagnostik -> tilbud_sendt -> godkendt -> i_gang -> faerdig -> afhentet
```

### contact_inquiries (NY)
```sql
create table contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  status text not null default 'ny' check (status in ('ny', 'besvaret', 'lukket')),
  admin_notes text,
  created_at timestamptz default now()
);
```

### sms_log (NY)
```sql
create table sms_log (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references repair_tickets(id),
  customer_id uuid references customers(id),
  phone text not null,
  message text not null,
  provider_message_id text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz default now()
);
```

## Admin-panel navigation

```
Dashboard        -- overblik, stats, seneste sager (eksisterer, opgraderes)
Indlevering      -- NY: opret sag for walk-in kunde
Reparationer     -- sagsliste med filter/soegning (eksisterer, opgraderes)
Kunder           -- kundeliste med enheder og historik (eksisterer, opgraderes)
Henvendelser     -- NY: indbakke for kontaktformular
Prisliste        -- brand/model/service admin (eksisterer)
SMS Log          -- NY: oversigt over sendte SMS'er
```

## Indleveringsflow

4-trins wizard i admin-panelet til walk-in og booking-kunder:

### Trin 1: Kunde
- Soeg eksisterende kunde (telefon/email/navn)
- Eller opret ny med privat/erhverv toggle
- Erhverv: firmanavn + CVR felter

### Trin 2: Enhed + tjekliste
- Vaelg eksisterende enhed fra kunden
- Eller registrer ny (brand, model, serienr, farve)
- Tilstandstjekliste (hvert punkt: OK/fejl/ikke relevant + foto + note):
  - Skaerm (ridser/revner/dead pixels)
  - Bagside/ramme (buler/ridser)
  - Kamera (virker/ridset)
  - Opladning (virker/virker ikke)
  - Lyd/hoejttaler (virker/virker ikke)
  - Knapper (virker/virker ikke)
  - Vandskade-indikator (udloest/ikke udloest)
  - Batteri (health %)
  - Find My / iCloud (deaktiveret/aktiv)
  - Adgangskode modtaget (ja/nej)
  - Tilbehoer indleveret (cover, lader, osv.)
- Tag check-in fotos (kamera/upload)

### Trin 3: Reparation
- Vaelg services fra prislisten (auto-lookup baseret paa brand/model)
- Tilfoej evt. fritekst-service med manuel pris
- Interne noter til vaerkstedet

### Trin 4: Opsummering + opret
- Forhaandsvisning af indleveringsbevis
- "Opret sag" knap:
  1. Gemmer alt i Supabase
  2. Genererer indleveringsbevis (PDF)
  3. Genererer vaerkstedsrapport (PDF)
  4. Sender SMS + email til kunden
  5. Opretter Shopify Draft Order (valgfrit)

## Indleveringsbevis (PDF til kunden)

- PhoneSpot logo + butiksinformation
- Sags-ID + dato
- Kundeoplysninger (navn, tlf, email)
- Enhed (brand, model, serienr, farve)
- Tilstandsbeskrivelse ved indlevering (fra tjekliste)
- Valgte reparationer med priser
- Samlet pris (estimat)
- Forventet faerdigdato
- Vilkaar (garanti, afhentningsfrist, ansvar)
- QR-kode til kundeportal (fase 2)

## Vaerkstedsrapport (PDF til tekniker)

- Sags-ID stort og tydeligt
- Kundenavn + telefon
- Enhed + serienummer
- Check-in fotos
- Valgte reparationer (checkliste-format med afkrydsning)
- Interne noter
- Plads til teknikerens egne noter (print)

## SMS-notifikationer

**Udbyder:** GatewayAPI (REST API)

**Automatiske SMS'er ved statusskift:**

| Status | Besked |
|--------|--------|
| modtaget | "Hej {navn}, vi har modtaget din {enhed}. Sags-ID: {id}. Vi vender tilbage med et tilbud." |
| tilbud_sendt | "Hej {navn}, dit tilbud paa {enhed} er klar: {pris} DKK. Svar JA for at godkende." |
| godkendt | "Tak! Vi gaar i gang med din {enhed}. Forventet faerdig: {dato}." |
| faerdig | "Hej {navn}, din {enhed} er klar til afhentning i {butik}. Aabningstider: {tider}." |

**Manuel SMS:** Fritekst-felt paa sagen til custom beskeder.

**SMS-log:** Alle sendte SMS'er logges med tidspunkt, modtager, besked og status.

## Shopify-integration

### Shopify Admin API:
- Oprette Draft Orders fra reparationssager
- Oprette/matche kunder i Shopify
- Sende betalingslinks (Shopify Invoice) via SMS/email

### Shopify Webhooks:
- `orders/paid` -> markerer sagen som betalt
- `orders/cancelled` -> markerer betaling annulleret

### Betalingsflow (3 muligheder per sag):

| Metode | Hvornaar | Hvordan |
|--------|----------|---------|
| POS i butik | Indlevering eller afhentning | Draft Order -> POS |
| Online forud | Kunde booker hjemmefra | Draft Order -> betalingslink via SMS/email |
| Online efterfoelgende | Reparation faerdig | Betalingslink sendt til kunde |

Klarna, kort, MobilePay haandteres af Shopify Payments. Systemet roerer ikke betalingsdata.

## Kontakthenvendelser

- Kontaktformularen (`POST /api/contact`) gemmer nu ogsaa i `contact_inquiries` tabel
- Admin-panel faar "Henvendelser" side med indbakke-visning
- Status: ny -> besvaret -> lukket
- Admin kan tilfoeje noter

## To indgange til systemet

| Vej | Flow |
|-----|------|
| Walk-in | Kunde kommer i butik -> I opretter sag i admin -> tjekliste -> betaling via POS |
| Online booking | Kunde booker paa hjemmesiden -> sag oprettes automatisk -> evt. forudbetaling online -> kunde moeder op |

Begge ender i samme sagssystem.

## Tekniske detaljer

- PDF-generering: `@react-pdf/renderer` (server-side)
- Fil-upload: Supabase Storage med signerede URLs
- SMS API: GatewayAPI REST (`POST https://gatewayapi.com/rest/mtsms`)
- Shopify API: `@shopify/shopify-api` (Admin API, Draft Orders)
- Webhooks: Next.js API routes (`/api/webhooks/shopify`)
- RLS: Alle nye tabeller faar public read disabled, authenticated write/read

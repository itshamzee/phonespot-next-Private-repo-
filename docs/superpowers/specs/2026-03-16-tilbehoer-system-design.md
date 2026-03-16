# Tilbehør System — Bulk-oprettelse, Click & Collect, Stregkoder

**Dato:** 2026-03-16
**Status:** Godkendt af ejer

---

## Oversigt

Tre sammenhængende systemer til PhoneSpot's tilbehørsforretning:

1. **Hurtig produktoprettelse** i admin med template-system og multi-model support
2. **Stregkodehåndtering** — scan eksisterende EAN, taste ind manuelt, eller generer nyt
3. **Click & Collect** — lagerstatus per butik + reservation med SMS

---

## Del 1: Hurtig produktoprettelse

### Admin-side: `/admin/tilbehoer/opret`

**Primært flow (manuel):**
1. Vælg kategori (Cover, Panserglas, Oplader, Kabel, Høretelefoner, Andet)
2. Vælg kompatible enheder via multi-select (grupperet: Apple → iPhone 16 Pro, 16 Pro Max... Samsung → Galaxy S25...)
3. Udfyld: Produktnavn, Pris (DKK), Indkøbspris, Lager (online + butik separat)
4. Stregkode-sektion: Scan EAN / Tast ind manuelt / Generer ny EAN
5. Billede: Tag foto med telefon-kamera (via browser MediaDevices API) eller upload fil
6. Tryk "Opret" → systemet opretter ét produkt PER valgt enhed

**Eksempel:** Vælg "Cover" + 5 iPhone-modeller + "Silikone Cover Sort" + 149 kr → 5 produkter oprettes på 2 sekunder. Hvert produkt får automatisk slug, SKU, og kompatibel-model reference.

### Template-system

- "Gem som template" knap gemmer: kategori, navn-mønster, pris, indkøbspris, billede
- Templates vises på opret-siden som hurtigvalg
- Vælg template → vælg modeller → opret. 2 klik.
- Admin-side: `/admin/tilbehoer/templates` til at se/redigere/slette templates

---

## Del 2: Stregkodehåndtering

### Tre metoder, samme felt

EAN-feltet på opret-formularen har 3 knapper:

1. **Scan** — åbner kamera, bruger `quagga2` eller `html5-qrcode` til at læse stregkode
   - Hvis EAN findes i Open EAN Database API: autofyld produktnavn + billede
   - Hvis ikke fundet: beholder EAN, resten udfyldes manuelt
2. **Tast ind** — manuelt input felt til EAN/UPC-kode
3. **Generer** — genererer en intern EAN-13 kode (prefix 200xxxx for interne koder)

### EAN Lookup

- API: `https://opengtindb.org/api.php?ean={ean}` (gratis, tysk/europæisk)
- Fallback: `https://world.openfoodfacts.org/api/v0/product/{ean}.json`
- Resultatet er et forslag — brugeren bekræfter/redigerer altid inden oprettelse

---

## Del 3: Click & Collect

### Database

```sql
-- Ny kolonne på accessories
ALTER TABLE accessories ADD COLUMN store_stock integer DEFAULT 0;
ALTER TABLE accessories ADD COLUMN store_id text DEFAULT 'slagelse';

-- Reservationer
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL CHECK (product_type IN ('accessory', 'device')),
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  store_id text NOT NULL DEFAULT 'slagelse',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'collected', 'expired', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  ready_at timestamptz,
  collected_at timestamptz
);
```

### Kundeoplevelse

**Produktkort (tilbehørsside + produktsider):**
- Grøn badge: "✓ På lager i Slagelse — afhent i dag"
- Grå badge: "Kun online" (når store_stock = 0)
- Orange badge: "Sidste 2 stk i butikken"

**Produktside — Click & Collect flow:**
1. Knap: "Afhent i butik — klar om 1 time" (ved siden af "Læg i kurv")
2. Klik → slide-in formular: Navn + Telefon (email valgfri)
3. Submit → opretter reservation + sender SMS bekræftelse
4. Reservation udløber automatisk efter 24 timer

**SMS-beskeder (via Gateway API — allerede integreret):**
- Bekræftelse: "Hej {navn}, din reservation er registreret. Afhent i PhoneSpot Slagelse inden {dato}. Vis denne SMS."
- Klar: "Din vare er klar til afhentning i PhoneSpot Slagelse. Åbningstider: Man-Fre 10-18, Lør 10-16."
- Påmindelse (efter 20 timer): "Husk at afhente din reservation inden i morgen."

### Admin

**Dashboard-widget:** Aktive reservationer med status
- Liste: Kundenavn, produkt, tidspunkt, status
- Handlinger: "Klar til afhentning" (sender SMS) → "Afhentet" (afslutter)
- Automatisk udløb: Cron job der sætter status=expired efter 24 timer og frigiver lager

**Lagerstyring:**
- Separat "Butik-lager" og "Online-lager" felter på hvert produkt
- Reservation trækker fra butik-lager midlertidigt
- Ved afhentning: permanent træk fra butik-lager

---

## Del 4: Tilbehørsside redesign

### Ny sidestruktur: `/tilbehoer`

1. **Hero** — butiksbillede (covers-væggen) + "Alt tilbehør til din enhed"
2. **Hurtig-filter** — "Find tilbehør til:" + model-søgebar med autofuldførelse
3. **Kategori-gitter** — 5 kategorier med billeder (ikke bare ikoner)
4. **Produktgrid** — alle produkter med:
   - Billede, navn, pris
   - Click & Collect badge
   - "Tilføj til kurv" knap
5. **Sidebar filtre** — Kategori, Mærke, Model, Pris-range, Kun på lager i butik

### Kategorisider: `/tilbehoer/[category]`
- Filtreret grid med alle produkter i kategorien
- Model-filter i sidebar

---

## Datamodel

### `accessories` tabel
```
id              uuid PK
name            text NOT NULL
slug            text UNIQUE NOT NULL
category        text NOT NULL (cover, screen_protector, charger, cable, audio, other)
brand           text (apple, samsung, generic, etc.)
compatible_models text[] (array af model-slugs)
price           integer NOT NULL (DKK i øre)
cost_price      integer
sku             text UNIQUE
ean             text
image_url       text
description     text
online_stock    integer DEFAULT 0
store_stock     integer DEFAULT 0
store_id        text DEFAULT 'slagelse'
status          text DEFAULT 'draft' (draft, published, archived)
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### `accessory_templates` tabel
```
id              uuid PK
name            text NOT NULL
category        text NOT NULL
default_price   integer
default_cost_price integer
image_url       text
description     text
created_at      timestamptz DEFAULT now()
```

### `reservations` tabel
(som beskrevet ovenfor)

---

## API Routes

- `POST /api/admin/accessories` — opret produkt(er)
- `GET /api/admin/accessories` — liste med filtre
- `PUT /api/admin/accessories/[id]` — opdater produkt
- `DELETE /api/admin/accessories/[id]` — slet/arkiver
- `POST /api/admin/accessories/bulk` — bulk-opret fra template
- `GET /api/admin/accessories/ean-lookup?ean=XXX` — EAN opslag
- `POST /api/admin/accessories/generate-ean` — generer intern EAN
- `GET /api/accessories` — public liste (med filtre, pagination)
- `GET /api/accessories/[slug]` — public enkelt produkt
- `POST /api/reservations` — opret reservation (public)
- `GET /api/admin/reservations` — admin liste
- `PUT /api/admin/reservations/[id]` — opdater status

---

## Tekniske valg

- **Stregkodescanner:** `html5-qrcode` (allerede bruges til QR i projektet)
- **Kamera til billeder:** Browser MediaDevices API → canvas → upload til Supabase Storage
- **SMS:** Gateway API (allerede integreret i projektet)
- **Cron for reservation-udløb:** Supabase pg_cron eller Next.js cron route
- **Søgning/filtrering:** Supabase full-text search + array contains for kompatibilitet

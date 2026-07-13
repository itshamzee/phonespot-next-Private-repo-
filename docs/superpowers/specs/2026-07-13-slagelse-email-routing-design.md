# Slagelse email-routing — design

**Dato:** 2026-07-13
**Status:** Godkendt, klar til implementeringsplan

## Formål

PhoneSpot har oprettet en dedikeret postkasse `slagelse@phonespot.dk`. Alle
henvendelser der handler om Slagelse-butikken skal routes dertil i stedet for
den generelle `info@phonespot.dk`. Det gælder:

- Afhentning/reservation der vedrører Slagelse
- Reparationsbooking der vedrører Slagelse
- Kontaktformular-henvendelser mærket Slagelse
- Kontakt-mailen der vises under Slagelse-butiksprofilen (`/butik/slagelse`)

`info@phonespot.dk` skal fortsat modtage en kopi (som skjult BCC).

## Nuværende tilstand

- **`src/lib/store-config.ts`** har allerede et `email`-felt pr. butik.
  Slagelse peger i dag på `info@phonespot.dk`; Vejle har allerede sit eget
  `vejle@phonespot.dk`. Feltet bruges af `/butik/[slug]` (kontaktkort +
  JSON-LD `email`).
- **`/api/contact`** sender hardcoded til `info@phonespot.dk`. Kontaktsiden
  har intet butiksvalg (kun emne: Support/Salg/Andet).
- **`/api/repairs`** sender hardcoded til `info@phonespot.dk`. Booking-wizarden
  (`src/components/repair/booking-wizard.tsx`) er butiks-blind; både Slagelse-
  og Vejle-butikssiden linker til samme `/reparation/booking`. Kundens
  bekræftelsesmail signeres altid med den Slagelse-hardcodede `STORE`.
- **`/api/reservations`** fanger allerede `store_id` (default `"slagelse"`) og
  persisterer det på `reservations`, men sender **ingen** staff-notifikation i
  dag (`createReservation` inserter kun til DB).
- Trade-in/opkøb (`saelg-din-enhed`) er en separat flow og er **uden for scope**.

## Valgt tilgang

`store-config.ts` er den ene kilde til hver butiks postkasse. En tynd
routing-helper afleder modtagere ud fra `store_id` og tilføjer `info@` som BCC.
Alternativ (separat routing-modul) blev fravalgt: emailen bor allerede i
store-config, så ekstra indirektion giver ingen gevinst.

## Ændringer

### 1. Config — ny postkasse

`src/lib/store-config.ts`: `STORES.slagelse.email` ændres fra
`info@phonespot.dk` til `slagelse@phonespot.dk`.

Dette alene løser **butiksprofil-mailen**: `/butik/slagelse` renderer
`store.email` i kontaktkortet og i JSON-LD (`ElectronicsRepair.email`). Ingen
yderligere ændring nødvendig på den side.

### 2. Central routing-helper

Ny fil `src/lib/email/staff-routing.ts`:

```ts
import { STORES } from "@/lib/store-config";

export const CENTRAL_INBOX = "info@phonespot.dk";

/**
 * Vælg staff-modtagere ud fra butik.
 * - Kendt butik → butikkens mailboks som `to`, CENTRAL_INBOX som `bcc`.
 * - Ukendt/ingen butik → CENTRAL_INBOX som `to`, ingen bcc (undgår dublet).
 */
export function getStaffRecipients(storeId?: string | null): {
  to: string;
  bcc?: string[];
} {
  const store = storeId ? STORES[storeId] : undefined;
  const to = store?.email ?? CENTRAL_INBOX;
  const bcc = to === CENTRAL_INBOX ? undefined : [CENTRAL_INBOX];
  return { to, bcc };
}
```

`info@` sendes som **BCC** (ikke `to`), så primær-leveringen til den nye
butiksmail altid går igennem, selv hvis `info@` er blokeret hos Resend.

### 3. Reservation / afhentning — ny staff-mail

`/api/reservations/route.ts`: efter en succesfuld `createReservation` sendes en
staff-notifikation via `getStaffRecipients(store_id)`. Slagelse-reservationer
→ `slagelse@` med `info@` BCC.

Indhold (dansk, `text`):

- Produkt (navn + type)
- Kunde: navn, telefon, evt. email
- Butik (`store_id`)
- Reservations-ID og udløb

Fejl i mail-afsendelsen må **ikke** vælte selve reservationen (den er allerede
gemt) — wrap i try/catch og log fejlen, returnér stadig reservationen.

### 4. Reparationsbooking — butiksvalg

**Wizard** (`src/components/repair/booking-wizard.tsx`):

- Nyt påkrævet **butiksvalg** (radio: Slagelse / Vejle) i "Detaljer"-trinnet
  (step 2 / `step === 2`).
- Default `slagelse`. Respekterer `?store=vejle` i URL'en (samme
  `useSearchParams` som allerede bruges til brand/model/service-prefill).
- `store_id` tilføjes i `buildPayload()`.

**Vejle-butiksside** (`src/app/butik/[slug]/page.tsx`): de to booking-links i
`VEJLE_ACTIVITIES` / "Reparation i butikken"-sektionen der peger på
`/reparation/booking` opdateres til `/reparation/booking?store=vejle`.

**API** (`/api/repairs/route.ts`):

- Modtager `store_id` (valgfrit; default `slagelse` hvis udeladt for
  bagudkompatibilitet).
- Staff-mailen routes via `getStaffRecipients(store_id)`.
- Kundens bekræftelsesmail signeres med den **valgte** butiks config
  (`STORES[store_id]`) i stedet for den hardcodede `STORE` — navn, adresse,
  email.
- `store_id` persisteres på `repair_tickets` (se migration nedenfor).

### 5. Kontaktformular — butiksvalg

**Kontaktside** (`src/app/kontakt/page.tsx`): nyt **"Butik"-felt** (select) med
værdier:

- `Generel henvendelse` (default) → `info@` (nuværende adfærd bevares)
- `Slagelse` → `slagelse@` (+ info BCC)
- `Vejle` → `vejle@` (+ info BCC)

Feltet sendes som `store_id` i payload (tom/undefined ved "Generel").

**API** (`/api/contact/route.ts`): staff-mailen routes via
`getStaffRecipients(store_id)`. `store_id` persisteres på `contact_inquiries`.

### 6. DB-migrationer

To små migrationer i `supabase/migrations/` (følg eksisterende
navnekonvention `YYYYMMDD_...`):

- `repair_tickets`: tilføj nullable `store_id text`.
- `contact_inquiries`: tilføj nullable `store_id text`.

Ingen backfill nødvendig — eksisterende rækker forbliver `null` (fortolkes som
"ukendt/generel"). `reservations` har allerede `store_id`.

## Modtager-matrix

| Overflade                         | Butik = Slagelse        | Butik = Vejle          | Generel/ukendt |
|-----------------------------------|-------------------------|------------------------|----------------|
| Butiksprofil-mail (`/butik/...`)  | `slagelse@` (vist)      | `vejle@` (vist)        | —              |
| Reservation staff-mail (NY)       | `slagelse@` + info bcc  | `vejle@` + info bcc    | info@          |
| Reparation staff-mail             | `slagelse@` + info bcc  | `vejle@` + info bcc    | info@ (default slagelse) |
| Kontakt staff-mail                | `slagelse@` + info bcc  | `vejle@` + info bcc    | info@          |

## Kendt risiko: info@ suppression hos Resend

`info@phonespot.dk` er pt. **suppressed i Resend** efter et hard bounce
(2026-04-17). BCC-kopien til `info@` bliver derfor **stille droppet** indtil
suppressionen fjernes manuelt i Resend-dashboardet. Primær-leveringen til
`slagelse@`/`vejle@` påvirkes ikke. Dette er en driftshandling uden for koden;
den bør udføres hvis kopierne reelt skal modtages.

## Uden for scope

- Trade-in/opkøb-flow (`saelg-din-enhed`, `/api/trade-in/*`).
- Ordrebekræftelser og staff-ordrenotifikationer (webshop-køb) — de er ikke
  butiks-scopede henvendelser.
- Faktisk oprettelse af `slagelse@`-postkassen (allerede gjort af ejer).

## Test / verifikation

- Reservation med `store_id=slagelse` → staff-mail har `to: slagelse@`,
  `bcc: [info@]`.
- Reparationsbooking med butik=Vejle → staff-mail `to: vejle@`; kundemail
  signeret med Vejle-adresse.
- Reparationsbooking med butik=Slagelse → `to: slagelse@`.
- Kontaktformular med butik=Slagelse → `to: slagelse@`; butik=Generel →
  `to: info@`, ingen bcc.
- `/butik/slagelse` viser `slagelse@phonespot.dk` i kontaktkortet og JSON-LD.

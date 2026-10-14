# Tracking-events

Modul: `src/lib/tracking/events.ts`. Hver hændelse sendes som gtag-event (GA4 og Google Ads deler samme tag) og som Meta Pixel standard-event med fælles `event_id` (til senere CAPI-dedup). gtag styres af Consent Mode v2; Meta sendes kun, når cookie-banneret er accepteret.

Klik på tel:, ruter, WhatsApp og Messenger fanges af én global listener (`src/components/tracking/global-click-tracker.tsx`, monteret i `app/layout.tsx`). Admin-sider ignoreres.

| GA4-event | Meta | Fyres når | Params |
|---|---|---|---|
| `repair_booking` | `Schedule` (value, DKK) | Reparation booket: "betal i butikken" ved svar fra `/api/repairs` (booking-wizard, prisside-kurv, indsend-formular); Stripe-betalt på `/reparation/bekraeftelse` når sagen er betalt. Samme `event_id` (`repair_<sagsid>`), og sessionStorage-lås mod genindlæsning | store (vejle/slagelse/webshop/indsend), brand, model, service, value, currency=DKK, event_id |
| `click_to_call` | `Contact` | Klik på ethvert `tel:`-link | store (fra sidens sti), page_path, phone |
| `get_directions` | `FindLocation` | Link til google.com/maps, maps.google.com, maps.app.goo.gl, maps.apple.com eller `/dir/` | store (fra linket, ellers siden), page_path |
| `generate_lead` | `Lead` | Kontaktformular, opkøb ("sælg din enhed") og erhvervsreparation sendt | lead_type (contact_form/buyback/business_repair), store |
| `click_to_messenger` / `click_to_whatsapp` | `Contact` | Klik på m.me / wa.me-link (i dag kun Messenger-chat) | store, page_path |
| `purchase` (GA4, nyt) | (uændret `Purchase`) | Ordrebekræftelse, én gang pr. ordrenummer pr. session | transaction_id, value, shipping, currency, items[] |
| `manual_event_PURCHASE` | – | Uændret | transaction_id, value, currency |

GA4 `purchase` blev ikke sendt andre steder (kun page_view fra `<GoogleAnalytics>`), så der er ingen dobbelttælling.

## UTM-bevarelse

`captureAttribution()` gemmer første `utm_source/medium/campaign`, `gclid`, `fbclid` i sessionStorage (`ps-attribution`) og overskriver aldrig. Vedhæftes som `metadata.attribution` (jsonb) på `/api/contact`-kald (kontakt, opkøb, erhvervsreparation), da `contact_inquiries.metadata` allerede findes.

Mangler: `repair_tickets` har ingen kildekolonne, så `/api/repairs` og `/api/repairs/checkout` får endnu ikke kilde. Kræver en migration (fx `repair_tickets.attribution jsonb`), at klienterne sender `getAttribution()` med, og at checkout-routen lægger det i Stripe-metadata. Server-side CAPI kræver desuden, at `event_id` gemmes på sagen/ordren.

## Konverteringer der skal oprettes

Forudsætning: GA4-ejendommen er linket til Google Ads. Brug GA4-import (kræver ingen konverteringsetiketter). Først når eventet har været sendt mindst én gang, vises det i GA4.

### GA4 (Admin, Events, markér som key event)

`repair_booking`, `generate_lead`, `click_to_call`, `purchase`. Valgfrit: `get_directions`.

### Google Ads (Mål, Konverteringer, Ny konverteringshandling, Website, Importér fra GA4)

| Handling | Kategori | Primær/sekundær | Værdi | Optælling |
|---|---|---|---|---|
| `repair_booking` | Book aftale | Primær | Brug værdi fra eventet (DKK); standard 500 kr | Hver |
| `generate_lead` (opkøb) | Indsendt formular til kundeemne | Primær for opkøbskampagner, ellers sekundær | Fast 150 kr (justér efter lukkerate) | Én |
| `click_to_call` | Telefonopkald | Sekundær | Fast 100 kr | Én pr. klik/session |
| `get_directions` | Hent rutevejledning | Sekundær | Fast 30 kr | Én |
| `purchase` (GA4) | Køb | Behold `manual_event_PURCHASE` som primær, importer ikke `purchase` som primær (ellers dobbelttælling) | Brug værdi | Hver |

Kontaktformular (`generate_lead`, lead_type=contact_form) bør være sekundær. Ads kan ikke splitte på parameter ved GA4-import, så opret enten ét `generate_lead`-mål som sekundært, eller et GA4-custom event pr. lead_type, hvis opkøb skal være primær.

Værdierne er forslag, ejeren skal bekræfte dem. Meta: events er standard-events og kan bruges direkte i Events Manager (Schedule, Lead, Contact, FindLocation).

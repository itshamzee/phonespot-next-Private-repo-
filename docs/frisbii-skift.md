# Skift fra Stripe til Frisbii (Flatpay)

Status 2026-11-03: integrationen er bygget og testet med mocks, men slået fra.
Stripe kører uændret, indtil `PAYMENT_PROVIDER=frisbii` sættes i Vercel.

Frisbii er Flatpays online-betalingsplatform (tidligere Reepay / Billwerk+
Optimize). Docs: https://docs.frisbii.com/docs/new-web-shop og
https://docs.frisbii.com/docs/billwerk-checkout.

## Hvad er bygget

| Flow | Stripe i dag | Frisbii |
|---|---|---|
| Webshop-checkout (`/api/checkout/session`) | Stripe Checkout | Frisbii charge-session (hosted betalingsvindue, redirect) |
| Bekræftelse (`/ordre/bekraeftelse`) | `?session_id=` | `?provider=frisbii&id=<session>&invoice=<handle>`; siden færdiggør selv ordren, hvis webhooken ikke er nået frem endnu (status hentes fra Frisbiis API) |
| Webhook | `/api/webhook/stripe` | `/api/webhook/frisbii` (`invoice_authorized`, `invoice_settled`) |
| Lager, garantier, mails, Pushover | `handleCheckoutCompleted` | samme kode: `lib/checkout/finalize-order.ts` |
| Udløbet session | `checkout.session.expired` | daglig oprydning i `/api/cron/release-reservations` |
| Gendannet kurv (`/checkout/recover/[token]`) | ny Stripe-session | ny Frisbii-session med nyt handle |
| Refundering (`/api/refund`, `/api/shipping/orders/[id]/refund`) | Stripe refund | Frisbii refund, eller annullering hvis betalingen kun er reserveret |
| Hævning | sker ved køb | ved afsendelse/afhentning (se nedenfor) |

Ikke flyttet endnu (kører fortsat på Stripe, også efter skiftet):

- Reparationsbetaling online (`/api/repairs/checkout`, `lib/stripe/repair-payment.ts`)
- Kladdeordrer/fakturalinks (`/api/platform/draft-orders/[id]/send`)
- POS-kortterminal (Stripe Terminal). Flatpays fysiske terminaler er et separat spor.

Stripe skal altså blive ved med at være konfigureret, til de tre er flyttet,
og så længe gamle Stripe-ordrer kan blive returneret.

## Datamodel (ingen migration nødvendig)

Frisbii-ordrer genbruger de eksisterende kolonner:

- `orders.payment_method = 'frisbii'` (Stripe-ordrer har `'stripe'`)
- `orders.stripe_checkout_session_id` = Frisbii session-id (`cs_…`)
- `orders.stripe_payment_id` = Frisbii charge-handle, normalt ordrenummeret
  (`S-1234`), eller `S-1234-ab12` ved en gendannet kurv

`complete_checkout_order` og `expire_checkout_order` er udbyderneutrale og
bruges uændret. Kolonnenavnene kan omdøbes senere, når Stripe er helt ude.

## Reservation og hævning

Standard er `FRISBII_SETTLE_MODE=on_ship`: kortet reserveres ved køb, og beløbet
hæves først, når ordren sendes eller udleveres. Det er hovedreglen for fysiske
varer i Danmark og det, indløsere forventer. Hævningen sker automatisk i:

- `/api/shipping/labels` (fragtlabel oprettet → `shipped`)
- `/api/shipping/orders/[id]/fulfill` (markeret afsendt eller leveret)
- `PATCH /api/shipping/orders/[id]` (status `shipped`, `picked_up` eller `delivered`)

En fejlet hævning stopper aldrig forsendelsen; personalet får en Pushover og
skal hæve manuelt i Frisbii admin.

En reservation holder typisk kun ca. 7 dage. Den daglige cron sender en
Pushover, hvis en Frisbii-ordre har stået bekræftet, men usendt, i 5+ dage
(oftest afhentning i butik, som kunden ikke har hentet).

`FRISBII_SETTLE_MODE=instant` hæver med det samme, som Stripe gør i dag. Spørg
Flatpay, hvad de kræver, før det bruges.

Refundering af en ordre, der kun er reserveret: fuldt beløb annullerer
reservationen. Et delbeløb afvises med en forklaring. Send ordren først (så
hæves den), eller annullér hele beløbet.

## Når API-adgangen kommer: tjekliste

1. **Frisbii admin (app.frisbii.com)**
   - Developers > API Credentials: opret en privat nøgle til test og en til live.
   - Developers > Webhooks: URL `https://phonespot.dk/api/webhook/frisbii`
     (preview: preview-URL'en), events `invoice_authorized`, `invoice_settled`,
     `invoice_refund`, `invoice_cancelled`, `invoice_failed`. Kopiér webhook-secret.
   - Betalingsmetoder: aktivér kort/Dankort, MobilePay, Apple Pay og Google Pay
     (og Klarna/ViaBill/Anyday hvis aftalt). Sæt PhoneSpot-logo og farver på
     betalingsvinduet.
2. **Test på en Vercel Preview** (aldrig først på produktion)
   - Sæt i Preview-miljøet: `PAYMENT_PROVIDER=frisbii`,
     `FRISBII_PRIVATE_KEY=<test-nøgle>`, `FRISBII_WEBHOOK_SECRET=<test-secret>`.
   - Testkort: https://docs.frisbii.com/reference/testing
   - Gennemfør: køb med rabatkode + 3 for 2 (tjek at den negative rabatlinje
     accepteres; ellers sendes ét samlet beløb automatisk, og det står i loggen),
     køb med afhentning, MobilePay, afbrudt betaling (`/kasse?cancelled=true`),
     fragtlabel → hævning, fuld og delvis refundering, gendannet kurv.
   - Bekræft at ordrebekræftelse, garantibevis og Pushover kommer én gang.
3. **Skift produktion**
   - Sæt de samme tre variabler med live-nøgler i Vercel Production og redeploy.
   - Lad `STRIPE_*` stå: gamle ordrer, reparationer, kladdeordrer og POS bruger dem.
4. **Juridisk tekst, samme dag**
   - `/handelsbetingelser` (afsnit om betaling nævner "Stripe, Inc.") og
     `/privatlivspolitik` (Stripe som databehandler): tilføj Frisbii/Flatpay
     som betalingsbehandler, og behold Stripe så længe reparationer/POS kører der.
5. **Rul tilbage**: sæt `PAYMENT_PROVIDER=stripe` og redeploy. Ordrer, der
   allerede er betalt med Frisbii, kan stadig refunderes og hæves, så længe
   `FRISBII_PRIVATE_KEY` er sat.

## Kode

- `src/lib/payments/provider.ts`: valg af udbyder og Frisbii-indstillinger
- `src/lib/payments/frisbii/client.ts`: REST-klient (Basic auth, timeouts, fejl)
- `src/lib/payments/frisbii/checkout-session.ts`: session, ordrelinjer, handles
- `src/lib/payments/frisbii/order-payment.ts`: færdiggørelse, hævning, oprydning
- `src/lib/payments/frisbii/webhook-signature.ts`: `hex(hmac_sha256(secret, timestamp + id))`
- `src/lib/payments/refund.ts`: refundering pr. udbyder
- `src/lib/checkout/finalize-order.ts`: fælles ordrefærdiggørelse (flyttet fra `lib/stripe/webhook.ts`)
- Tests: `src/lib/payments/__tests__/frisbii.test.ts`, `src/app/api/webhook/frisbii/__tests__/route.test.ts`

## Åbne spørgsmål til Flatpay

- Kræver de hævning ved afsendelse, eller må vi hæve med det samme?
- Accepterer de negative ordrelinjer (rabat)? Koden falder tilbage til ét samlet beløb.
- Hvilke betalingsmetoder er med i aftalen (MobilePay, Apple Pay, Klarna, ViaBill, Anyday)?
- Hvor længe holder en reservation for kort og MobilePay hos jeres indløser?
- Kan Flatpay-terminalerne i butikkerne integreres via API (afløser for Stripe Terminal)?

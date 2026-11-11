# Flatpay-terminal i Kassen

Kassen kan sende kortbeløbet direkte til Flatpay-terminalen i butikken. Personalet
slår ikke længere beløbet ind og trykker ikke "Kortet er godkendt": salget gemmes
først, når terminalen har godkendt kortet.

Bygget 11/11-2026 og slået fra. Kassen kører manuelt, indtil
`POS_TERMINAL_PROVIDER=flatpay` er sat i Vercel.

## Sådan slås det til

1. Få brugernavn og adgangskode til Flatpays Socket API (partner-/integrationsbruger) fra Flatpay.
2. Kør lokalt:
   ```
   FLATPAY_USERNAME=... FLATPAY_PASSWORD=... node scripts/flatpay-setup.mjs
   ```
   Den viser GUID'en (partner-nøglen), terminalerne og om de er forbundet.
3. Prøv en rigtig betaling på 1 kr. på terminalen:
   ```
   FLATPAY_GUID=... node scripts/flatpay-setup.mjs --test <TID> 100
   ```
4. Sæt i Vercel (Production):
   - `FLATPAY_GUID` (eller `FLATPAY_USERNAME` + `FLATPAY_PASSWORD`)
   - `FLATPAY_TERMINAL_VEJLE`, `FLATPAY_TERMINAL_SLAGELSE` (TID pr. butik; nøglen er `locations.slug` med store bogstaver)
   - `POS_TERMINAL_PROVIDER=flatpay`
   - valgfrit `FLATPAY_TIMEOUT_MS` (standard 90000, maks. 100000)
5. Redeploy, og lav et salg og en retur i Kassen.

En butik uden `FLATPAY_TERMINAL_<BUTIK>` kan ikke tage kort, når flaget er slået til.
Kassen siger så "Der er ingen Flatpay-terminal sat op for butikken". Slå derfor
først flaget til, når alle butikker har en terminal.

## Sådan virker det

- `src/lib/pos/flatpay.ts`: klient til Socket API'et (login → GUID, start, status, annuller).
- `src/lib/pos/flatpay-terminal.ts`: `PaymentTerminal` til Kassen. Den starter betalingen, spørger efter status hvert 1,5 sekund og annullerer, hvis der ikke er svar inden tidsgrænsen. Derefter læser den status én gang til.
- Hver kortlinje får en fast `transactionReference` (UUID), som regnes ud fra Kassens reference. Et gentaget kald trækker derfor ikke kortet to gange. Knappen "Annuller betaling" finder den ventende betaling uden at slå noget op i databasen. Id'et gemmes som `order_payments.reference` på kortlinjen.
- Kassen godtager kun en godkendt betaling, hvis beløb, type (SALE/REFUND) og terminal er dem, der blev bedt om, og betalingen er oprettet efter kaldet startede (med 1 minuts margin for urforskel). Svarer Flatpay "allerede startet" (202), afvises betalingen. Et betalings-id, der allerede står på en anden betaling i `order_payments`, afvises (`terminal_duplicate`), og nye træk fra samme salg føres tilbage. Kan tjekket ikke køre, føres kortbetalingen tilbage, så kunden aldrig står med et træk uden et salg. Det forhindrer, at en genbrugt reference får et nyt salg til at se betalt ud.
- Retur sendes som en `REFUND`. Kunden skal holde kortet til terminalen igen, fordi Flatpay ikke kobler en retur til det oprindelige køb.
- Hvis et salg ikke kan gemmes efter et godkendt kort, laver Kassen automatisk en `REFUND`. Kunden skal også her holde kortet til terminalen.
- `/api/pos/sale` og `/api/pos/return` har `maxDuration = 120`.

## Ikke bygget endnu

- Webhooks (`POST /socket/webhook`, HMAC-SHA512 i headeren `flatpay-signature`). Kassen spørger selv efter status, så de er ikke nødvendige. De kan bruges som sikkerhed, hvis en betaling bliver afbrudt midt i.
- X/Z-rapport (`/socket/xreport`, `/socket/zreport`) i kasseopgørelsen.
- Sikkerhed: GUID'en sendes i adressen på GET-kald (Flatpays design). Vi logger aldrig adresserne.

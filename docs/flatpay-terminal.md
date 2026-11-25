# Flatpay-terminal i Kassen

Kassen kan sende kortbeløbet direkte til Flatpay-terminalen i butikken. Personalet
slår ikke længere beløbet ind og trykker ikke "Kortet er godkendt": salget gemmes
først, når terminalen har godkendt kortet.

Bygget 11/11-2026 og slået fra. Kassen kører manuelt, indtil
`POS_TERMINAL_PROVIDER=flatpay` er sat i Vercel.

## Terminalerne (modtaget 25/11-2026)

Flatpay udsteder én GUID pr. terminal (pr. indløsningsaftale). TID er terminalens
serienummer. GUID'erne ligger kun i Vercel, ikke i repoet.

| Butik (`locations.slug`) | Flatpay-navn | TID | Env-nøgler |
| --- | --- | --- | --- |
| `vejle-kontor` (Løversysselvej 3C) | Phonespot Vejle 1 | 1855059452 | `FLATPAY_TERMINAL_VEJLE_KONTOR`, `FLATPAY_GUID_VEJLE_KONTOR` |
| `vejle` (den gamle profil) | ingen | | kører manuelt |
| `vejle-gaagade` | Phonespot Vejle 2 | 1855122811 | `FLATPAY_TERMINAL_VEJLE_GAAGADE`, `FLATPAY_GUID_VEJLE_GAAGADE` |
| `esbjerg` | Phonespot Esbjerg | 1855055308 | `FLATPAY_TERMINAL_ESBJERG`, `FLATPAY_GUID_ESBJERG` |
| `slagelse` | ingen endnu | | kører manuelt |

## Sådan slås en butik til

1. Tænd terminalen og sæt den på nettet. Tjek, at den er forbundet:
   ```
   FLATPAY_GUID=<butikkens GUID> node scripts/flatpay-setup.mjs
   ```
2. Prøv en rigtig betaling på 1 kr. på terminalen:
   ```
   FLATPAY_GUID=<butikkens GUID> node scripts/flatpay-setup.mjs --test <TID> 100
   ```
3. Sæt i Vercel (Production):
   - `FLATPAY_TERMINAL_<BUTIK>` = TID og `FLATPAY_GUID_<BUTIK>` = butikkens GUID
     (nøglen er `locations.slug` med store bogstaver, bindestreg bliver til `_`).
     `FLATPAY_GUID` uden butik bruges kun, hvis butikken ikke har sin egen.
   - `POS_TERMINAL_PROVIDER=flatpay` (sættes én gang)
   - valgfrit `FLATPAY_TIMEOUT_MS` (standard 90000, maks. 100000)
4. Redeploy, og lav et salg og en retur i Kassen.

En butik uden `FLATPAY_TERMINAL_<BUTIK>` fortsætter manuelt ("Kortet er godkendt"),
selv om flaget er slået til. Butikkerne kan derfor slås til én ad gangen. Kassen
får butikkens kortflow fra `/api/pos/session` (`terminalKind`), retursiden fra
`/api/pos/return?register_id=`.

## Sådan virker det

- `src/lib/pos/flatpay.ts`: klient til Socket API'et (login → GUID, start, status, annuller).
- `src/lib/pos/flatpay-terminal.ts`: `PaymentTerminal` til Kassen. Den starter betalingen, spørger efter status hvert 1,5 sekund og annullerer, hvis der ikke er svar inden tidsgrænsen. Derefter læser den status én gang til.
- Hver kortlinje får en fast `transactionReference` (UUID), som regnes ud fra Kassens reference. Et gentaget kald trækker derfor ikke kortet to gange. Knappen "Annuller betaling" finder den ventende betaling uden at slå noget op i databasen. Id'et gemmes som `order_payments.reference` på kortlinjen.
- Kassen godtager kun en godkendt betaling, hvis beløb, type (SALE/REFUND) og terminal er dem, der blev bedt om, og betalingen er oprettet efter kaldet startede (med 1 minuts margin for urforskel). Svarer Flatpay "allerede startet" (202), afvises betalingen. Et betalings-id, der allerede står på en anden betaling i `order_payments`, afvises (`terminal_duplicate`), og nye træk fra samme salg føres tilbage. Kan tjekket ikke køre, føres kortbetalingen tilbage, så kunden aldrig står med et træk uden et salg. Det forhindrer, at en genbrugt reference får et nyt salg til at se betalt ud.
- Retur sendes som en `REFUND`. Kunden skal holde kortet til terminalen igen, fordi Flatpay ikke kobler en retur til det oprindelige køb.
- Hvis et salg ikke kan gemmes efter et godkendt kort, laver Kassen automatisk en `REFUND`. Kunden skal også her holde kortet til terminalen.
- Hver butik har sin egen GUID (`FLATPAY_GUID_<BUTIK>`), fordi Flatpay udsteder én pr. terminal.
- `/api/pos/sale` og `/api/pos/return` har `maxDuration = 120`.

## Ikke bygget endnu

- Webhooks (`POST /socket/webhook`, HMAC-SHA512 i headeren `flatpay-signature`). Kassen spørger selv efter status, så de er ikke nødvendige. De kan bruges som sikkerhed, hvis en betaling bliver afbrudt midt i.
- X/Z-rapport (`/socket/xreport`, `/socket/zreport`) i kasseopgørelsen.
- Sikkerhed: GUID'en sendes i adressen på GET-kald (Flatpays design). Vi logger aldrig adresserne.

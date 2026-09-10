# Nyt UI til PhoneSpot — beslutningsoplæg

10. september 2026 · branch `feat/astra-ui` · kildekode ved `1a2a18b`.

Ejeren ønsker et **reelt nyt og mere effektivt UI**. Anbefalingen er retning A: en redaktionel produktbutik med store, ægte fotos, tydelig købsindgang og færre konkurrerende budskaber. Retning B og C er selvstændige alternativer, ikke farvevariationer. Farver, dansk sprog og øvrige regler i AGENTS.md er fortsat bindende.

**Kataloget er under oprydning og skal ændres væsentligt.** Dagens produkter, priser og antal er øjebliksbilleder, ikke forslag til det fremtidige sortiment. Vi designer varige købsopgaver og tomme/ufuldstændige datatilstande. Endelige fremhævede varer, fotos og sammenligninger vælges efter katalogafklaringen. Ingen katalogændringer indgår her.

## Læs og vælg

1. [Forside: diagnose, tre retninger, desktop-/mobilskitser og fotoliste](01-forside-og-fotografi.md).
2. [Tilbehør: fire kommercielle greb med UI, datakrav og måling](02-tilbehoer.md).
3. [Konvertering: prioriteret top 10, dokumentation og optælling af flow](03-konverteringsaudit.md).
4. [Data: præcis bestilling til ejeren og forslag til GA4-instrumentering](04-data-og-maaling.md).

Ejerens efterfølgende ønske om Mobbin-referencer er registreret i forsideoplægget. Konkret skærmgennemgang afventer forbindelse/adgang; denne PR foregiver ikke at være Mobbin-baseret.

De stærkeste fund er en uoverensstemmelse mellem valgt fragt og vist total, manglende modelkontekst i tilbehør og tillidspåstande uden en tydelig dokumenteret datakilde. De består som problemer i visning og logik, selv når kataloget skiftes. Der er **ingen målt konverteringsgevinst** i dette oplæg; prioriteringen er en faglig vurdering med eksplicitte hypoteser.

## Beslutninger før implementering

- Vælg A, B eller C som retning. Anbefaling: A; brug butikkens dokumentation fra B længere nede på siden.
- Udpeg et lille, blivende udvalg af enheder og tilbehør til fotos og første kompatibilitetspilot. Ingen bestemte nuværende SKU'er er en forudsætning.
- Bekræft billedrettigheder, Trustpilot-kilde, anmeldelsers oprindelse og faktiske løfter om opkøb, montering og levering.
- Prioritér konverteringsfund separat fra det visuelle valg. Betalings-/fragtarbejde og eventuelle databasemigrationer kræver særskilt eksplicit aftale efter AGENTS.md.

Derefter: én PR for den valgte hero og dens umiddelbare overgang, derefter særskilte PR'er for tilbehørshub, kategori, produktside og eventuelt kurv. Øvrig forsidestruktur er vist som retning, ikke en samlet implementeringsordre. Måling kan få sin egen lille PR. Ingen ændringer i produktions-UI, API'er, tracking eller katalog i dette oplæg; ingen push til main.

## Undersøgelse og grænser

Kildegennemgang kombineret med browserobservationer på phonespot.dk ved desktop 1440 × 1000 og mobilvisning 390 × 844. Produktion kan afvige fra den lokale commit. Mobilvisningen er en ændret browservisning, ikke en fysisk iPhone/Safari-test. Se dækningsmatrix i auditten.

Der blev ikke gennemført køb, betalt eller sendt reparations-/opkøbs-/forsikringshenvendelser. En enhed blev midlertidigt lagt i kurven for at undersøge købsflowet, derefter fjernet; tom kurv blev kontrolleret. Hosted betaling, bekræftelser og tilbudsaccept er kun vurderet i kildekoden. Ingen analytics-, kundedata- eller ordreadgang er brugt; `.env.local` er ikke læst.

Validering: `npm run build` bestod efter genkørsel med netadgang til Google Fonts; 519 sider genereret. `npm run test:run`: 80 testfiler, 602 tests bestod. Eksisterende advarsler om workspace/lockfiles, middleware og test-`act` er ikke rettet. Kontrollerne er ikke dokumentation for konvertering eller fuld tilgængelighed. Eksisterende, uvedkommende arbejdsændringer medtages ikke i PR'en.

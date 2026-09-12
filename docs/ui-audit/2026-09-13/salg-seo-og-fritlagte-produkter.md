# Salgsside: SEO og billeder. Tilbehør: fritlagte produkter

Opfølgning på ejerens browserkommentarer. Lokal featurebranch `codex/tilbehoer-og-produktbilleder` fra `7f2912b`.

## Salgssiden

Sammenlignet med `4af0146^:src/app/saelg-din-enhed/page.tsx`. Det tidligere design havde særskilte afsnit om iPhone, Samsung Galaxy og laptops, genbrug, klargøring/data og otte spørgsmål. Den nyere side havde bevaret canonical og formular, men reduceret indholdet til generel introduktion, proces og fem spørgsmål.

- Genskabt emnedækning for opkøb af iPhone, Samsung, MacBook/Lenovo/Dell/HP; tilføjet særskilt vejledning om iPad/tablet, smartwatch og defekte enheder. Serverrenderet tekst, ikke afhængig af at bruge formularen.
- H1 beskriver nu sidens emne: “Sælg din brugte elektronik.” Sidetitel og beskrivelse omtaler de centrale mærker og begge butikker. Egen canonical og eksisterende sitemap-post er bevaret. Open Graph har et billede.
- Otte synlige FAQ-punkter, herunder klargøring, vurdering/betaling og længere brugstid. `FAQPage` og `BreadcrumbList` bruger projektets eksisterende `JsonLd`. FAQ-data afledes af samme indhold som de synlige spørgsmål. Strukturerede data er ikke et løfte om rich results eller bestemte placeringer.
- Naturfoto udfylder procesafsnittets venstre kolonne. Redaktionelt reparationsfoto og grøn baggrund ledsager afsnittet om at give elektronik nyt liv. Formularens komponent, validering og indsendelse er uændrede.
- De tidligere udokumenterede påstande om “bedste pris”, betaling inden 24 timer, bestemte CO₂-besparelser og garanteret opkøb uanset stand er ikke genindført. Teksten forklarer den faktiske vurderingsanmodning og et eventuelt tilbud.

Miljøafsnittet beskriver længere brugstid og mulig erstatning af nykøb, ikke en beregnet besparelse for PhoneSpot. Faglig kilde, også linket på siden: [Det Europæiske Miljøagentur om længere levetid for elektronik](https://www.eea.europa.eu/en/analysis/publications/europes-consumption-in-a-circular-economy-the-benefits-of-longer-lasting-electronics). Ingen påstande om træplantning eller kompensation.

Foto `public/images/buyback/groenne-traeer.jpg`: [Maria M., grønne trækroner, Pexels](https://www.pexels.com/photo/the-sun-shines-through-the-canopy-of-a-forest-28123754/), hentet i 1000 px fra billedets offentlige download, under Pexels-licensen. Reparationsfotoet er projektets eksisterende `/images/repair/tekniker-reparerer.jpg`; ikke beskrevet som eget personale.

## Tilbehør

- De seks lifestyle-flader er skiftet til fem fritlagte produktfotos; lydfotoet bruges også i hero. Alle fem filer er kontrolleret som PNG med alfakanal og visuelt gennemgået. Ingen baggrundsfjernelse, genererede produkter eller ændringer i varernes udseende.
- `object-fit: contain` viser hele produktet. Hero har samme baggrund som teksten. Kategoribilleder er 124 px høje mod tidligere 158 px på større skærme; mobilkort er 140 px brede mod 160 px. Logoerne er reduceret fra 116 × 60 til 80 × 40 px, symbolerne fra 42 til 28 px i bredden.
- Mærkernes farver, modelvalg og navigation er bevaret. Beskyttelsesglas er stadig almindelige produkter. Ingen lager- eller prisændringer.

Producenternes produktfotos fra Apple Store-billedserveren, hentet med `fmt=png-alpha`. Kategorillustrationer, ikke dokumentation for aktuelt lager. Billederne er producentmateriale; der er ikke tilskrevet dem en Pexels/Unsplash-licens.

| Lokal fil i `public/images/accessories/` | Kilde/produktreference |
| --- | --- |
| `cover-product.png` | [Apple etuier og beskyttelse](https://www.apple.com/dk/shop/accessories/all/cases-protection), MGFD4, grønt TechWoven-etui |
| `glass-product.png` | [Belkin UltraGlass 2 hos Apple](https://www.apple.com/dk/shop/product/hs832zm/a/belkin-ultraglass-2-sk%C3%A6rmbeskytter-til-iphone-18-pro-iphone-17-pro), HS832 |
| `charger-product.png` | [Apple opladere og mellemstik](https://www.apple.com/dk/shop/accessories/all/chargers-adapters), MQKJ3, USB-C-kabel |
| `audio-product.png` | [Apple høretelefoner](https://www.apple.com/dk/shop/accessories/all/headphones-speakers), airpods-max-select-202409-midnight |
| `stand-product.png` | [Twelve South hos Apple](https://www.apple.com/shop/accessories/all/office/twelve-south), HPKW2, Forté-holder |

CDN-skabelon: `https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/REFERENCE?wid=700&hei=700&fmt=png-alpha`, lyd 900 × 900 px. De afprøvede MKR64- og Belkin-JPEG-kandidater er erstattet, ikke medtaget som nye filer.

## Kontrol

- 14 tests bestået i salgssidens SEO-test, vurderingsflowets ti tests og mærkevælgerens to tests. SEO-testene fejlede først på manglende emneoverskrift og strukturerede data og bestod efter ændringen.
- Lint af ændrede TypeScript-filer og diff-kontrol bestået.
- Produktionsbuild bestået med lokale prøvedata: Next.js 16.1.6, TypeScript og 292 statiske sider, exit 0. Log: `.superpowers/sdd/2026-09-11-godkendt-design/buyback-seo-packshots-build.log`.
- Visuelt gennemgået ved computerbredde og 390 px: fritlagte billeder, logoer, formular, grønne trækroner og proces. Ingen vandret side-overløb. Ingen rigtig vurderingsanmodning eller andre kundedata sendt.

Arbejdet er lokalt. Ingen eksport til GitHub eller produktion.

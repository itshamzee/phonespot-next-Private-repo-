# Eksterne tilbehørsbilleder, mærker og telefonnummer

Opfølgning på ejerens browserkommentarer, 12. september 2026. Arbejdet fortsætter på `codex/tilbehoer-og-produktbilleder` efter `12d71cb`.

## Resultat

- Ny ekstern fotografering i tilbehørssidens hero og alle fem kategoriindgange. Ens billedfelter med individuel beskæring. Den tidligere serverforespørgsel efter tilfældige kategoribilleder er fjernet; produktkortene bruger fortsat varernes egne billeder.
- Mærkerække under kategorierne: Apple, Samsung, OnePlus, Google og Huawei, afledt af mærker med modeller i det eksisterende kompatibilitetsregister. Logoerne beholder deres farver. Valg af mærke viser modellerne; et præcist modelvalg åbner det almindelige katalog med det eksisterende `model`-filter. Mærkerne er ikke en lagerpåstand, og listen har ingen nye produktdata.
- Rækken kan bladres med knapper, touch eller tastaturfokus, når den ikke kan være på skærmen. Ingen automatisk bevægelse; reduceret bevægelse respekteres. Skift af mærke nulstiller det tidligere modelvalg.
- Klikbart `61 10 00 48` i fælles topbjælke, hentet fra `STORE.phone`, med internationalt `tel:+4561100048`-link. Mobil prioriterer garanti og telefonnummer; Trustpilot findes fortsat i footeren og i topbjælken på større skærme.
- Forsidens reparationsfelt er efter ejerens seneste kommentar ført tilbage til `/images/repair/tekniker-reparerer.jpg`. Fotoet af den ødelagte telefon er stadig på reparationssiden og nederst på tilbehørssiden.
- Beskyttelsesglas er fortsat almindelige produkter. Ingen ændringer i priser, lager, betalingsflow eller database.

## Billedkilder

Alle seks fotos er hentet eksternt som komprimerede JPEG-filer til `public/images/accessories/`. De er kategorifotos, ikke fotografier af PhoneSpots konkrete lager eller eget personale. Ingen AI-redigering.

| Fil | Fotograf og kilde |
| --- | --- |
| `hero.jpg` | [Chaitanya jadhav, iPhone and Accessories, Pexels](https://www.pexels.com/photo/iphone-and-accessories-25839639/) |
| `covers.jpg` | [Andrey Matveev, Smartphone, Earphones and Case, Pexels](https://www.pexels.com/photo/smartphone-earphones-and-case-21854447/) |
| `glas.jpg` | [Jakub Zerdzicki, Hand wiping smart phone screen with cloth, Pexels](https://www.pexels.com/photo/hand-wiping-smart-phone-screen-with-cloth-24503721/) — skærmpleje som illustration, ikke et foto af selve glasset |
| `opladere.jpg` | [Kaboompics, Flat Lay Shot of Two White Chargers, Pexels](https://www.pexels.com/photo/flat-lay-shot-of-two-white-chargers-5208819/) |
| `lyd.jpg` | [Petr Macháček, Black headset on beige surface, Unsplash](https://unsplash.com/photos/black-headset-on-beige-surface-j9MV1gV0l50) |
| `holdere.jpg` | [Efrem Efre, Blue Cellphone on Stand, Pexels](https://www.pexels.com/photo/blue-cellphone-on-stand-12985914/) |

Kilderne angiver fri brug under henholdsvis [Pexels-licensen](https://www.pexels.com/license/) og [Unsplash-licensen](https://unsplash.com/license). De afprøvede fotos fra GoGoNano og Pakutaso bruges ikke.

Apple-, Samsung-, OnePlus- og Huawei-logoer genbruges fra projektets eksisterende SVG-bibliotek. Det flerfarvede Google-logo er hentet fra [Googles egen billedserver](https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png) til `public/images/brands/google-color.png`. Mærkerne identificerer kundens enhed og angiver ikke et partnerskab.

## Kontrol

- 30 tests bestået i 8 filer: header, brandvalg, modelfiltre, produktkort, katalog og offentlige API-felter. Nye tests for korrekt telefonlink, præcist modelvalg og nulstilling ved mærkeskift blev først set fejle, derefter bestå.
- Lint af ændrede TypeScript-filer og kontrol af diff bestået.
- Produktionsbuild bestået med lokale prøvedata: Next.js 16.1.6, TypeScript og 292 statiske sider, exit 0. Log gemt lokalt i `.superpowers/sdd/2026-09-11-godkendt-design/accessories-photos-build.log`.
- Browserkontrol ved 1280, 1100 og 390 px: seks fotos og fem logoer indlæses; mobil har intet vandret sideoverløb. Mærkekarrusellens knapper, modelvalg og kataloglink afprøvet. Telefonlinket er kontrolleret uden at starte et opkald.
- Lokale prøvedata gengiver ikke alle databasefiltre; browserkontrollen bekræfter navigation og visning, mens API-tests dækker modelmatch. Ingen produktdata, ordrer eller leads er ændret.

Intet sendt til GitHub eller produktion i denne opfølgning.

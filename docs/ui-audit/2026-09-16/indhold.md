# Indholdsrettelser — 16. september 2026

## Gennemførte rettelser

- `reservation-form.tsx` henter nu navnet, adressen og telefonnummeret i sin Slagelse-visning fra `STORES.slagelse`. Søgning fandt ingen aktuelle `<ReservationForm>`-callsites, så reservationsflowet er ikke ændret.
- `/baerbare-vejle` bruger nu den allerede tilgængelige `STORES.vejle` i CTA'en og kontaktlinjen. CTA-adressen er derfor `Løversysselvej 3B` frem for den fejlagtige `3A`.
- Handelsbetingelserne er opdateret til version 2.1, 16. september 2026. Transportansvaret ved forbrugerkøb følger Forbrug.dk: PhoneSpot har ansvaret til aflevering til kunden eller dennes modtager, undtagen hvor kunden selv vælger en transportør, PhoneSpot ikke tilbyder. Kilde: https://forbrug.dk/faq/faq-koeb-paa-nettet, afsnittet “Pakken er forsvundet i posten”, læst 16. september 2026.
- Den nedlagte ODR-platform er erstattet med den verificerede danske side fra EU-Kommissionen om klagehjælp: https://consumer-redress.ec.europa.eu/index_da. Afsnittet om Nævnenes Hus er bevaret.
- Den eksisterende interne henvisning til privatlivspolitikken bruger nu Next.js `Link`, så den ændrede handelsbetingelsesside består lint uden at ændre den kundevendte destination.

## Afventer forretningsbeslutning

Følgende kundevendte løfter er registreret, men ikke ændret, fordi der fortsat mangler beslutning om en fælles returpolitik:

- Trusmi briller og blyant: “24 mdr./24 måneders fuld returret” på side og FAQ.
- iPhones Vejle og bærbare Vejle: 30 dages returret.
- Kasse: “Nem og gratis returnering”.
- Reparation Vejle og iPhone 18-tilbehør: livstidsgaranti.

B2B-vilkår og de eksisterende forbrugerfortrydelsesvilkår i handelsbetingelserne er ikke ændret.

## Kontrol

- Eksisterende store-config- og kontakttests: 3 testfiler og 19 tests bestået.
- Lint af de tre ændrede kildefiler bestået.

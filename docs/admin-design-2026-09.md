# Admin-design, september 2026

Retningslinjer for det nye admin. Første side bygget efter dem: `/admin/produkter/ny`. Primitiverne ligger i `src/components/admin/ui/`.

## Hvad admin er

Et arbejdsværktøj for 3–6 medarbejdere i Vejle og Slagelse, ofte på telefon i butikken, ofte med en kunde ventende. Det skal være hurtigt at se, hvad der kræver handling, og hurtigt at oprette og rette. Det er ikke en marketingside, og det må ikke ligne en generisk SaaS-skabelon med kort i kort.

## Tokens

Samme palette som webshoppen (`src/app/globals.css`), så tingene hænger sammen, men brugt tættere:

| Rolle | Token | Værdi |
|---|---|---|
| Baggrund | `cream` | #F7F7F8 |
| Flade | hvid | #FFFFFF |
| Hårlinje | `sand` | #E5E5EA |
| Tekst | `charcoal` | #111111 |
| Sekundær tekst | `gray` | #6E6E73 |
| Accent (én) | `green-eco` | #1A3D2E |
| Accent hover | `green-light` | #2D6B45 |
| Accent-flade | `green-pale` | #EAF2ED |
| Advarsel | – | #8A4B08 på #FFF4E5 |
| Fejl | – | #B42318 på #FDECEC |

Grøn bruges kun til den primære handling, aktive valg og "klar"-tilstand. Alt andet er sort/grå. Rød kun til fejl og destruktive handlinger.

## Typografi

Kun DM Sans. Ingen Barlow Condensed i admin, og ingen versaler som etiketter. Sentence case overalt.

| Brug | Størrelse |
|---|---|
| Sidetitel | 26/1.2, semibold |
| Sektionstitel | 16, semibold |
| Brødtekst og felter | 14 (inputs 16 pga. iOS-zoom) |
| Hjælpetekst, tabeller | 13 |
| Små etiketter | 12 |

Tal i tabeller og priser med `tabular-nums`.

## Form og afstand

- Ét radius til kontroller (8 px) og ét til flader (12 px). Ingen 24 px-hjørner.
- Ingen skygger, undtagen den løftede aktive knap i et segmenteret valg.
- Sektioner adskilles med en hårlinje og en titel, ikke med kasser. Kasser bruges kun til noget der reelt er et objekt (forhåndsvisningen, en tabel, en besked).
- Inputs 40 px høje, knapper 40 px (små 32 px). Fokusring 2 px grøn.
- 8 px-grid. Formularer højst 640 px brede, så linjerne kan læses.
- Mobil: felter stables, primær knap fæstnes i bunden.

## Tekst

- Knapper siger hvad der sker: "Opret 3 produkter", "Vis på webshoppen", ikke "Submit" eller "OK".
- Fejl siger hvad der gik galt og hvad man gør: "Ukendt model: Nokia 3310", ikke "Noget gik galt".
- Tomme tilstande inviterer til handling.
- Ingen emojis, ingen pile efter linktekst, ingen "WORD — forklaring".

## Det ene særlige greb

På opret-siden: en fast forhåndsvisning af produktet, præcis som det ser ud i webshoppens grid, med en tjekliste over hvad der mangler, før det er synligt og kan købes. Det er svaret på "webshoppen først": man ser resultatet, mens man udfylder, og knappen låses op, når alt er på plads. Alt andet på siden er roligt.

## Primitiver

`Button` (primary / secondary / quiet / danger), `Input` (med suffix som "kr"), `Textarea`, `Select`, `Field` (label, hjælp, fejl), `FieldRow`, `Section`, `Panel`, `Segmented`, `Chip`, `Toggle`, `Notice`, `PageHeader`. Nye admin-sider bruger disse og opfinder ikke egne knapper eller inputs.

# PhoneSpot.dk — instruktioner til AI-agenter

Dette repo er den kundevendte webshop + admin for PhoneSpot (dansk forhandler af
refurbished elektronik med butikker i Vejle og Slagelse). Læs hele denne fil,
før du ændrer noget.

## Arkitektur

- **Stack:** Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres),
  Stripe checkout, Resend (mail), Shipmondo (fragt). Deployes på Vercel.
- **VIGTIGT — deploy:** Vercel deployer `main` direkte til produktion
  (phonespot.dk). **Push aldrig til `main`.** Arbejd på en feature-branch
  (f.eks. `feat/astra-ui`) og lav en pull request.
- Kommandoer: `npm run dev` (lokal), `npm run build` (produktion),
  `npx vitest run` (tests), `npx tsc --noEmit` (typecheck).
  Kør build + tests, før du åbner en PR.
- Blogindlæg er MDX-filer i `src/content/blog/` med frontmatter
  (title/description/date/slug/keywords/category).
- Admin bor under `src/app/(admin)/admin/` bag middleware + cookie-session.
- Hemmeligheder ligger i `.env.local` — **læs den ikke, og commit den aldrig.**
  Frontend-arbejde behøver kun de offentlige `NEXT_PUBLIC_*`-variabler.

## Design-regler (ufravigelige)

- **Ingen emojis** nogen steder på websitet.
- Apple Store-inspireret, rent og redaktionelt. Undgå AI-generiske mønstre:
  ingen 4-ens-kort-grids, gradient-silhuetter eller pill-pile som bærende
  designgreb. Asymmetri, typografi og ægte produktfotos frem for "safe" kort.
- **Typografi:** DM Sans i sentence-case til navigation og UI. Barlow Condensed
  bruges kun som display-font — aldrig uppercase i navigation ("shouty").
- Farver/tokens: mørkegrøn `#1A3D2E`, charcoal-tekst, varm hvid/creme-baggrunde.
  Følg de eksisterende siders klasser frem for at opfinde nye paletter.
- Ægte produktfotos i marketing/hero-flader — ikke CSS/SVG-mockups af enheder.

## Indholds- og lovregler (ufravigelige)

- **Garanti:** 36 måneders garanti gælder KUN enheder (iPhones, iPads, Macs
  osv.). Tilbehør har 2 års reklamationsret. Skriv aldrig 36 mdr. på tilbehør.
- Skriv aldrig **"Panserglas"** i kundevendt tekst (beskyttet varemærke) —
  brug "beskyttelsesglas" eller "hærdet glas".
- Skriv aldrig "original kasse/emballage" om refurbished iPhones.
- **"Foxway" og "dropship" må ALDRIG nævnes i kundevendt UI eller tekst** —
  det er interne leverandørforhold.
- Trustpilot-rating er **4,7** (dk.trustpilot.com/review/phonespot.dk).
- PhoneSpot sælger ikke egen forsikring — elektronikforsikring henviser til
  Storstrøm Forsikring-flowet, der allerede findes.
- Alt kundevendt indhold er på dansk.

## SEO-regler

- Hver indekserbar side skal have egen `alternates.canonical` (aldrig arve
  forsidens). Client components får metadata via en `layout.tsx` i mappen.
- Nye offentlige sider tilføjes i `src/app/sitemap.ts`.
- Brug eksisterende JSON-LD-mønstre (`@/components/seo/json-ld`).

## Samarbejde

- Claude Code arbejder også i dette repo. Koordinér gennem git: små, fokuserede
  commits med beskrivende danske commit-beskeder, og PR'er mod `main`.
- Rør ikke ved Supabase-migrationer, betalings- eller fragtkode uden eksplicit
  aftale — frontend/UI er dit område.

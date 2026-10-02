import { STORES } from "@/lib/store-config";

// llms.txt: en kort, faktuel oversigt til AI-søgemaskiner (ChatGPT, Perplexity,
// Claude, Copilot). Butiksdata hentes fra store-config, så adresser og
// åbningstider aldrig kommer ud af trit med sitet.
export const dynamic = "force-static";

const SITE = "https://phonespot.dk";

function storeLines() {
  return [STORES.vejle, STORES.slagelse].map((s) =>
    [
      `### ${s.name}`,
      `- Adresse: ${s.street}, ${s.zip} ${s.city}`,
      `- Telefon: ${s.phone}`,
      `- Åbent: man–fre ${s.hours.weekdays}, lør ${s.hours.saturday}, søn ${s.hours.sunday}`,
      `- Kort: ${s.googleMapsUrl}`,
    ].join("\n"),
  );
}

export function GET() {
  const body = `# PhoneSpot

> PhoneSpot er en dansk forhandler af refurbished elektronik og et reparationsværksted for telefoner og tablets med fysiske butikker i Vejle og Slagelse. Vi reparerer iPhone, Samsung, iPad og andre mærker mens du venter, og sælger kvalitetstestede refurbished iPhones, iPads og MacBooks med 36 måneders garanti.

## Reparation — fakta
- Walk-in uden tidsbestilling i begge butikker. 90% af alle skærm- og batteriskift er klar på 30 minutter.
- Livstidsgaranti på arbejde og dele ved telefon- og tabletreparationer: opstår den samme fejl igen på den udskiftede del, repareres den uden beregning. Nye skader (fald, tryk, væske) er ikke dækket. Behandling af vandskade har 3 måneders garanti.
- Kunden vælger selv skærmkvalitet (budget, OEM eller original), og prisen er fast og oplyst før reparationen.
- Gratis diagnose ved disken i butikken. En fuld diagnose (fx printfejl) koster 249 kr.
- Gratis indsendelse: kunder uden for Vejle og Slagelse kan sende enheden ind.
- Gratis parkering ved butikken i Vejle.

## Butikker
${storeLines().join("\n\n")}

## Vigtige sider
- [Reparation — find model og pris](${SITE}/reparation): priser på skærmskift, batteriskift m.m. for alle modeller
- [Reparation i Vejle](${SITE}/reparation-vejle): walk-in, prisoversigt og garantivilkår
- [iPhone-reparation](${SITE}/reparation/iphone): alle iPhone-modeller med priser
- [Samsung-reparation](${SITE}/reparation/samsung): alle Galaxy-modeller med priser
- [Book reparation](${SITE}/reparation/booking)
- [Refurbished iPhones](${SITE}/iphones): med 36 måneders garanti
- [Garanti](${SITE}/garanti): garanti på refurbished enheder
- [Sælg din enhed](${SITE}/saelg-din-enhed): vi køber brugte telefoner, tablets og computere
- [Erhverv](${SITE}/erhverv): reparation og enheder til virksomheder
- [Butikker](${SITE}/butik)
- [Blog og guides](${SITE}/blog)

## Anmeldelser og profiler
- Trustpilot: https://dk.trustpilot.com/review/phonespot.dk
- Facebook: https://www.facebook.com/phonespot.dk/
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

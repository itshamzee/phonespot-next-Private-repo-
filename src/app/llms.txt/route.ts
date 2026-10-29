import { STORES, UPCOMING_STORES } from "@/lib/store-config";
import { REPAIR_WARRANTY_ANSWER } from "@/lib/repairs/warranty-copy";
import { PHONESPOT_ONE_LINER, PHONESPOT_PROMISES } from "@/lib/promises";

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

function upcomingStoreLines() {
  return Object.values(UPCOMING_STORES).map((s) =>
    [
      `### ${s.name} (åbner ${s.opens})`,
      s.street ? `- Adresse: ${s.mall ? `${s.mall}, ` : ""}${s.street}, ${s.zip} ${s.city}` : `- By: ${s.city} (adressen offentliggøres ved åbning)`,
      `- Butikken er ikke åbnet endnu: ${SITE}/butik/${s.slug}`,
    ].join("\n"),
  );
}

export function GET() {
  const body = `# PhoneSpot

> ${PHONESPOT_ONE_LINER} Vi reparerer iPhone, Samsung, iPad, MacBook og andre mærker mens du venter, køber brugte enheder op og sælger brugte, istandsatte iPhones, iPads og MacBooks.

## Køb brugt iPhone — fakta
- Brugte og refurbished iPhones, iPads, MacBooks, Android-telefoner og smartwatches, testet og istandsat på eget værksted.
- 36 måneders garanti på enheder. Tilbehør har 2 års reklamationsret.
- 30 dages returret på enheder (ud over den lovpligtige fortrydelsesret på 14 dage).
- Kosmetisk stand A, B eller C. Batteri min. 90 % ved levering; under 90 % skiftes batteriet uden beregning.
- Køb online med levering, eller se og afhent enheden i Vejle eller Slagelse.
- Brugte iPhones: ${SITE}/iphones · Android: ${SITE}/smartphones · Guide: ${SITE}/blog/koeb-brugt-iphone

## PhoneSpots 6 løfter
${PHONESPOT_PROMISES.map((p, i) => `${i + 1}. ${p.title}: ${p.detail}`).join("\n")}

## Reparation — fakta
- Walk-in uden tidsbestilling i begge butikker. 90% af alle skærm- og batteriskift er klar på 30 minutter.
- ${REPAIR_WARRANTY_ANSWER}
- Kunden vælger selv skærmkvalitet (budget, OEM eller original), og prisen er fast og oplyst før reparationen.
- Gratis hurtigt tjek ved disken i butikken. En fuld diagnose (fx printfejl) koster 249 kr.
- Gratis indsendelse: kunder uden for Vejle og Slagelse kan sende enheden ind.
- Gratis parkering ved butikken i Vejle.

## Butikker
${[...storeLines(), ...upcomingStoreLines()].join("\n\n")}

## Vigtige sider
- [Komplet prisliste som tekst](${SITE}/llms-full.txt): pris på hver reparation for hver model (iPhone, Samsung, iPad, MacBook, konsoller m.fl.), én linje pr. ydelse
- [Reparationspriser og fakta](${SITE}/reparation/priser): prisliste for alle modeller, garanti, ventetid, adresser og åbningstider samlet på én side
- [Reparation — find model og pris](${SITE}/reparation): priser på skærmskift, batteriskift m.m. for alle modeller
- [Reparation i Vejle](${SITE}/reparation-vejle): Løversysselvej 3B, 7100 Vejle. Walk-in, 90% af skærm- og batteriskift klar på 30 min, livstidsgaranti på arbejde og dele, gratis parkering
- [Reparation i Slagelse](${SITE}/reparation-slagelse): VestsjællandsCentret 10A, 103, 4200 Slagelse. Walk-in, 90% af skærm- og batteriskift klar på 30 min, livstidsgaranti på arbejde og dele
- [Reparation Hedensted](${SITE}/reparation-hedensted): værkstedet i Vejle, ca. 15 min ad E45 fra Hedensted, livstidsgaranti, gratis parkering
- [Reparation Horsens](${SITE}/reparation-horsens): værkstedet i Vejle, ca. 25 min ad E45 fra Horsens, livstidsgaranti, gratis parkering
- [Reparation Kolding](${SITE}/reparation-kolding): værkstedet i Vejle, ca. 25 min ad E45 fra Kolding, livstidsgaranti, gratis parkering
- [Reparation Fredericia](${SITE}/reparation-fredericia): værkstedet i Vejle, ca. 25 min fra Fredericia, livstidsgaranti, gratis parkering
- [Reparation for Næstved](${SITE}/reparation-naestved): ingen butik i Næstved; butikken i VestsjællandsCentret, Slagelse, ligger ca. 30 min ad rute 22, åbent alle ugens dage, eller send ind med gratis fragtlabel
- [Send enheden ind til reparation](${SITE}/reparation/indsend): gratis fragtlabel, samme livstidsgaranti som i butikken, for kunder uden for Vejle og Slagelse
- [Dyson-reparation](${SITE}/reparation/dyson): Dyson-støvsugere med fast pris pr. model, 12 måneders garanti på dele og arbejde, uafhængigt værksted
- [Xbox-reparation](${SITE}/reparation/xbox): Xbox-konsoller og controllere i Vejle og Slagelse
- [iPhone-reparation](${SITE}/reparation/iphone): alle iPhone-modeller med priser
- [Samsung-reparation](${SITE}/reparation/samsung): alle Galaxy-modeller med priser
- [iPad-reparation](${SITE}/reparation/ipad): alle iPad-modeller med priser
- [MacBook-reparation](${SITE}/reparation/macbook): MacBook Air og Pro, vilkår aftales ved den enkelte reparation
- [Android-reparation](${SITE}/reparation/android): Samsung, Google Pixel, OnePlus og flere mærker
- [Tablet-reparation](${SITE}/reparation/tablet): iPad, Samsung Galaxy Tab og andre tablets, livstidsgaranti på arbejde og dele
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

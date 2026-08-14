import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";

export type FaqItem = { q: string; a: string };

/**
 * Merged FAQ for a device/template product page (iPhone, iPad, MacBook,
 * Apple Watch).
 *
 * This used to be split across two near-identical FAQ blocks that both
 * rendered on the SAME page load: one inside `DeviceDetail` (functionality/
 * grade/warranty/compatibility focused) and one at page level in
 * `[collection]/[product]/page.tsx` and `refurbished/[slug]/page.tsx`
 * (condition/fault/delivery/return focused). This is the union of both sets
 * of questions, deduplicated only where the question text was identical —
 * every distinct question that used to appear on the page still does,
 * exactly once, via this single shared source.
 */
export function getDeviceFaq(displayName: string): FaqItem[] {
  return [
    {
      q: `Er denne ${displayName} fuldt funktionel?`,
      a: "Ja, 100%. Alle enheder gennemgår 30+ individuelle kvalitetstests. Vi tester skærm, batteri, kamera, højttalere, mikrofon, sensorer, porte og meget mere. Enheden er nulstillet til fabriksindstillinger og opdateret til nyeste software.",
    },
    {
      q: "Hvad er standen på denne enhed?",
      a: "Vi vurderer alle enheder efter et A/B/C-system. Stand A er næsten som ny uden synlige ridser. Stand B har lette brugsspor, men skærmen er perfekt. Stand C kan have tydelige kosmetiske mærker, men er fuldt funktionel. Alle enheder gennemgår minimum 30 kontrolpunkter uanset stand.",
    },
    {
      q: "Hvad er forskellen mellem Grade A, B og C?",
      a: "Forskellen er udelukkende kosmetisk — alle grader er 100% funktionelle. Grade A er i perfekt stand uden synlige mærker. Grade B har lette brugsspor. Grade C har synlige brugsspor men er den billigste mulighed. Batterikapaciteten hænger ikke sammen med graden — den måles individuelt for hver enhed og oplyses altid på produktsiden.",
    },
    {
      q: "Hvad dækker de 36 måneders garanti?",
      a: "Garantien dækker alle fabrikationsfejl og funktionelle mangler i 36 måneder. Det inkluderer problemer med skærm, batteri, kamera, højttalere og interne komponenter. Garantien dækker ikke fysisk skade eller kosmetisk slid.",
    },
    {
      q: "Hvad gør jeg hvis enheden har en fejl?",
      a: "Alle vores produkter leveres med 36 måneders garanti. Hvis du oplever en fejl, kontakt vores kundeservice, og vi finder en løsning hurtigst muligt — enten reparation, ombytning eller refundering. Du er altid dækket.",
    },
    {
      q: "Kan jeg bruge alle danske mobilabonnementer?",
      a: "Ja. Alle enheder er ulåste (factory unlocked) og virker med alle danske operatører — TDC, Telenor, Telia, 3, Lebara og andre.",
    },
    {
      q: "Hvor hurtigt leverer I?",
      a: "Vi sender din ordre inden for 1-2 hverdage. Du modtager en sporings-mail så snart pakken er afsendt. Vi leverer med DAO eller PostNord direkte til din dør eller nærmeste pakkeshop.",
    },
    {
      q: "Hvad hvis jeg ikke er tilfreds?",
      a: "Du har 14 dages fuld fortrydelsesret. Returner enheden i original stand, og vi refunderer det fulde beløb inkl. fragt. Ingen spørgsmål stillet.",
    },
    {
      q: "Kan jeg returnere enheden?",
      a: "Ja, du har altid 14 dages fuld returret fra den dag du modtager din ordre. Enheden skal returneres i samme stand som du modtog den. Kontakt os, og vi sender dig en returetiket. Pengene refunderes inden for 3-5 hverdage.",
    },
  ];
}

/**
 * FAQ for a SKU/accessory product page (cases, chargers, cables, spare
 * parts, etc. — the fallback branch in `[collection]/[product]/page.tsx`
 * for any slug that isn't a device template).
 *
 * Deliberately NOT `getDeviceFaq`: an accessory has no battery, no A/B/C
 * cosmetic grade, and is not covered by the 36-month device warranty (that
 * warranty is sold with — and priced into — refurbished devices only). Using
 * the device FAQ here would put false, binding commercial claims on a
 * leather iPad case. These four questions cover only what's actually true
 * for every accessory: statutory 2-year reklamationsret, 14-day fortrydelse,
 * free shipping over the real threshold, and fit/compatibility.
 */
export function getAccessoryFaq(displayName: string): FaqItem[] {
  const freeShippingKr = FREE_SHIPPING_THRESHOLD / 100;
  return [
    {
      q: `Passer ${displayName} til min enhed?`,
      a: "Kompatibiliteten fremgår af produkttitlen og beskrivelsen ovenfor. Er du i tvivl om modelmatch, så kontakt os før du bestiller, så bekræfter vi det for dig.",
    },
    {
      q: "Hvad hvis varen er defekt eller går i stykker?",
      a: "Du har 2 års reklamationsret efter købeloven. Opstår der en fabrikationsfejl eller mangel, kontakter du bare vores kundeservice, så finder vi en løsning — reparation, ombytning eller refundering.",
    },
    {
      q: "Kan jeg fortryde mit køb?",
      a: "Ja, du har 14 dages fuld fortrydelsesret fra den dag du modtager varen. Returner den i den stand du modtog den, og vi refunderer det fulde beløb.",
    },
    {
      q: "Hvor hurtigt leverer I, og er der fri fragt?",
      a: `Vi sender din ordre inden for 1-2 hverdage. Ved køb over ${freeShippingKr} kr er fragten fri — ellers tilføjes et fragtgebyr ved checkout.`,
    },
  ];
}

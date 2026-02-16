import type { Metadata } from "next";
import { FaqAccordion } from "@/components/ui/faq-accordion";

export const metadata: Metadata = {
  title: "FAQ - Ofte stillede spørgsmål | PhoneSpot",
  description:
    "Find svar på de mest stillede spørgsmål om refurbished produkter, garanti, levering og returnering hos PhoneSpot.",
};

const FAQ_ITEMS = [
  {
    question: 'Hvad betyder "refurbished"?',
    answer:
      "Refurbished betyder, at enheden er professionelt inspiceret, testet og klargjort til videresalg. Alle vores enheder gennemgår en grundig kvalitetskontrol.",
  },
  {
    question: "Hvilken stand er jeres produkter i?",
    answer:
      'Vi bruger tre graderinger: "Som ny" (Grade A) — næsten ingen brugstegn, "Meget god" (Grade B) — lette brugstegn, "OK stand" (Grade C) — synlige brugstegn men fuldt funktionsdygtig.',
  },
  {
    question: "Har I garanti?",
    answer:
      "Ja, alle vores refurbished produkter leveres med 12 måneders garanti.",
  },
  {
    question: "Hvordan returnerer jeg et produkt?",
    answer:
      "Du har 14 dages fortrydelsesret fra modtagelsen. Kontakt os via kontaktformularen eller på info@phonespot.dk.",
  },
  {
    question: "Hvornår får jeg min ordre?",
    answer:
      "Vi sender ordrer mandag-fredag. De fleste ordrer leveres inden for 1-3 hverdage med GLS.",
  },
  {
    question: "Er det sikkert at købe refurbished?",
    answer:
      "Absolut. Alle enheder er testet og godkendt af vores teknikere. Derudover er du beskyttet af 12 måneders garanti og 14 dages fortrydelsesret.",
  },
  {
    question: "Kan jeg betale med MobilePay?",
    answer:
      "Ja, vi accepterer MobilePay, Visa, Mastercard og bankoverførsel.",
  },
  {
    question: "Hvad er jeres Outlet?",
    answer:
      "Vores Outlet indeholder produkter med særligt gode priser — det kan være restlager, udgåede modeller eller produkter med mindre kosmetiske fejl.",
  },
];

export default function FaqPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-3 font-display text-3xl font-extrabold italic text-charcoal md:text-4xl">
          Ofte stillede spørgsmål
        </h1>
        <p className="mb-10 text-gray">
          Her finder du svar på de mest almindelige spørgsmål om vores
          refurbished produkter, garanti, levering og meget mere.
        </p>
        <FaqAccordion items={FAQ_ITEMS} />
      </div>
    </section>
  );
}

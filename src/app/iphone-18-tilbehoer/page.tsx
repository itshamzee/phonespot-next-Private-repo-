import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";

/**
 * SEO-landing for tilbehør til efterårets nye iPhones (lanceret 9/9 2026):
 * iPhone 18 Pro, iPhone 18 Pro Max og den foldbare iPhone Duo. Siden er live
 * fra lanceringsdagen for at fange søgninger tidligt — produkterne kobles på,
 * efterhånden som covers og beskyttelsesglas kommer i handlen.
 */

export const metadata: Metadata = {
  title: "Covers & Beskyttelsesglas til iPhone 18 Pro, Pro Max & iPhone Duo | PhoneSpot",
  description:
    "Tilbehør til de nye iPhones: covers og beskyttelsesglas til iPhone 18 Pro (6,3\"), iPhone 18 Pro Max (6,9\") og den foldbare iPhone Duo. Se lanceringsdatoer og udvalg hos PhoneSpot.",
  keywords:
    "iphone 18 pro cover, iphone 18 pro max cover, iphone duo cover, iphone 18 beskyttelsesglas, iphone 18 pro tempered glass, iphone duo skærmbeskyttelse",
  alternates: { canonical: "https://phonespot.dk/iphone-18-tilbehoer" },
  openGraph: {
    type: "website",
    locale: "da_DK",
    siteName: "PhoneSpot",
    url: "https://phonespot.dk/iphone-18-tilbehoer",
    title: "Covers & Beskyttelsesglas til iPhone 18-serien og iPhone Duo",
    description:
      "Beskyt din nye iPhone fra dag ét. Covers og beskyttelsesglas til iPhone 18 Pro, 18 Pro Max og iPhone Duo — hos PhoneSpot i Vejle, Slagelse og online.",
  },
};

const MODELS = [
  {
    name: "iPhone 18 Pro",
    screen: "6,3\" display",
    colors: "Bordeaux, Glacier Blue, Silver og Black",
    release: "I handlen fra 18. september 2026",
    note: "Ny kameraø og nye mål — covers til iPhone 17 Pro passer ikke nødvendigvis. Vælg altid tilbehør mærket til iPhone 18 Pro.",
  },
  {
    name: "iPhone 18 Pro Max",
    screen: "6,9\" display",
    colors: "Bordeaux, Glacier Blue, Silver og Black",
    release: "I handlen fra 18. september 2026",
    note: "Den store model kræver sit eget beskyttelsesglas i fuld størrelse — glas til Pro-modellen dækker ikke.",
  },
  {
    name: "iPhone Duo",
    screen: "5,4\" ydre display · 7,6\" udfoldet",
    colors: "Nattehimmel og Stjernehvid",
    release: "I handlen fra 23. oktober 2026",
    note: "Apples første foldbare iPhone. Den ydre skærm kan beskyttes med hærdet glas; den indre, foldbare skærm kræver en særlig blød beskyttelsesfilm — brug aldrig almindeligt hærdet glas på den.",
  },
];

const FAQ = [
  {
    question: "Hvornår kan jeg købe covers til iPhone 18 Pro og Pro Max?",
    answer:
      "Vi hjemtager covers og beskyttelsesglas til iPhone 18-serien i takt med lanceringen den 18. september 2026. Udvalget lander løbende her på siden og i vores butikker i Vejle og Slagelse.",
  },
  {
    question: "Passer mit cover fra iPhone 17 Pro til iPhone 18 Pro?",
    answer:
      "Regn ikke med det. Selv små ændringer i mål og kameraø betyder, at covers sjældent kan genbruges på tværs af generationer. Vælg altid et cover, der er mærket specifikt til iPhone 18 Pro eller iPhone 18 Pro Max.",
  },
  {
    question: "Kan man sætte beskyttelsesglas på iPhone Duo?",
    answer:
      "Ja og nej. Den ydre 5,4\"-skærm kan beskyttes med almindeligt hærdet glas. Den indre, foldbare 7,6\"-skærm må ikke få hærdet glas — den kræver en blød beskyttelsesfilm, der kan bøje med skærmen. Brug kun film, der er lavet specifikt til iPhone Duo.",
  },
  {
    question: "Hvad koster beskyttelsesglas med montering?",
    answer:
      "Vi monterer beskyttelsesglas i butikken, mens du venter — så sidder det perfekt uden støv og bobler. Se de aktuelle priser på vores beskyttelsesglas-side, hvor iPhone 18-serien tilføjes ved lancering.",
  },
];

export default function Iphone18TilbehoerPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
            { "@type": "ListItem", position: 2, name: "Tilbehør", item: "https://phonespot.dk/tilbehoer" },
            { "@type": "ListItem", position: 3, name: "iPhone 18-serien", item: "https://phonespot.dk/iphone-18-tilbehoer" },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />

      {/* Hero */}
      <section className="bg-[#F7F7F8] border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <ol className="flex flex-wrap items-center gap-1.5 text-[#86868B]">
              <li><Link href="/" className="hover:text-[#111111]">Forside</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tilbehoer" className="hover:text-[#111111]">Tilbehør</Link></li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-[#111111]">iPhone 18-serien</li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <span className="inline-block rounded-full bg-[#1A3D2E]/10 px-4 py-1.5 text-sm font-bold text-[#1A3D2E]">
              Netop lanceret
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-[#111111] md:text-5xl">
              Covers & beskyttelsesglas til iPhone 18 Pro, Pro Max og iPhone Duo
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[#86868B]">
              Apple har præsenteret efterårets nye iPhones — og de fortjener beskyttelse fra
              dag ét. Her samler vi covers og beskyttelsesglas til hele den nye serie,
              efterhånden som tilbehøret kommer i handlen.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/beskyttelsesglas"
                className="inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-8 py-3 text-sm font-bold text-white transition-all hover:bg-[#1A3D2E]/90"
              >
                Se beskyttelsesglas
              </Link>
              <Link
                href="/tilbehoer/covers"
                className="inline-block rounded-full border border-[#E5E5EA] bg-white px-8 py-3 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#F7F7F8]"
              >
                Se covers
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* De tre modeller */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111]">
            De nye modeller — og hvad de kræver
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {MODELS.map((m) => (
              <div key={m.name} className="flex flex-col rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-6">
                <h3 className="font-display text-xl font-bold text-[#111111]">{m.name}</h3>
                <p className="mt-1 text-sm font-medium text-[#1A3D2E]">{m.screen}</p>
                <p className="mt-3 text-sm leading-relaxed text-[#111111]/70">{m.note}</p>
                <div className="mt-auto pt-4 text-xs text-[#86868B]">
                  <p>Farver: {m.colors}</p>
                  <p className="mt-1">{m.release}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hvorfor beskytte fra dag ét */}
      <section className="border-t border-[#E5E5EA] bg-[#F7F7F8]">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111]">
            Derfor skal beskyttelsen på fra første dag
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#111111]/70">
            <p>
              De fleste skader sker i telefonens første leveår — og en skærmreparation på en
              helt ny topmodel er blandt de dyreste reparationer overhovedet. Et
              beskyttelsesglas til et par hundrede kroner tager slaget i stedet for skærmen,
              og et godt cover beskytter hjørner og bagside, hvor de fleste revner starter.
            </p>
            <p>
              Hos PhoneSpot monterer vi beskyttelsesglasset for dig i butikken i Vejle eller
              Slagelse — perfekt placeret, uden støv og luftbobler, mens du venter. Skulle
              uheldet alligevel være ude, står vores værksted klar:{" "}
              <Link href="/reparation/iphone" className="font-semibold text-[#1A3D2E] underline">
                iPhone-reparation med livstidsgaranti
              </Link>{" "}
              — også på de nye modeller.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[#E5E5EA] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111]">
            Ofte stillede spørgsmål
          </h2>
          <div className="mt-6 space-y-6">
            {FAQ.map((item) => (
              <div key={item.question}>
                <h3 className="font-display text-base font-bold text-[#111111]">{item.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#111111]/70">{item.answer}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-8 text-center">
            <h3 className="font-display text-xl font-bold text-[#111111]">
              Skal din nuværende iPhone skiftes ud?
            </h3>
            <p className="mt-2 text-sm text-[#86868B]">
              Sælg din gamle iPhone til os, og brug pengene på den nye — eller spar tusinder
              med en kvalitetstestet refurbished model med 36 måneders garanti.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/saelg-din-enhed"
                className="inline-flex items-center gap-2 rounded-full bg-[#1A3D2E] px-8 py-3 text-sm font-bold text-white transition-all hover:bg-[#1A3D2E]/90"
              >
                Sælg din enhed
              </Link>
              <Link
                href="/iphones"
                className="inline-block rounded-full border border-[#E5E5EA] bg-white px-8 py-3 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#F7F7F8]"
              >
                Se refurbished iPhones
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

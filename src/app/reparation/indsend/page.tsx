import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";

const URL = "https://phonespot.dk/reparation/indsend";
const TITLE = "Send din telefon ind – gratis fragtlabel | PhoneSpot";
const DESCRIPTION =
  "Book online, vælg Send ind, og få en gratis fragtlabel på mail. Aflever pakken i en pakkeshop, så reparerer vi og kontakter dig. Livstidsgaranti.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
};

const STEPS = [
  {
    title: 'Book online og vælg "Send ind"',
    text: "Vælg din model og reparation i bookingen, og vælg Send ind som leveringsmetode. Du vælger også, hvilken af vores butikker der skal modtage pakken.",
  },
  {
    title: "Vi mailer en gratis fragtlabel",
    text: "Fragtlabelen kommer til den mailadresse, du booker med. Du betaler ikke for at sende enheden til os.",
  },
  {
    title: "Aflever pakken i en pakkeshop",
    text: "Pak enheden ned, sæt labelen på pakken, og aflever den i en pakkeshop, når det passer dig.",
  },
  {
    title: "Vi reparerer og kontakter dig",
    text: "Vi reparerer enheden, kontakter dig, når den er færdig, og sender den tilbage til dig.",
  },
];

const PACKING = [
  "Tag backup af din enhed, inden du sender den.",
  "Fjern cover og SIM-kort.",
  "Pak enheden forsvarligt ind, så den ikke flytter sig i pakken.",
  "Sæt fragtlabelen tydeligt på pakken.",
];

const FAQS = [
  {
    question: "Hvad koster det at sende enheden ind?",
    answer:
      "Fragtlabelen, du bruger til at sende enheden til os, er gratis. Reparationen koster den faste pris, du ser i bookingen.",
  },
  {
    question: "Gælder garantien også, når jeg sender ind?",
    answer:
      "Ja. Telefon- og tabletreparationer har livstidsgaranti på arbejde og dele, uanset om du afleverer i butikken eller sender ind. Garantien dækker ikke nye skader som fald eller væske, og behandling af vandskade har 3 måneders garanti.",
  },
  {
    question: "Kan jeg vælge skærmkvalitet, når jeg sender ind?",
    answer:
      "Ja, du vælger mellem budget, OEM og original i bookingen, hvor det findes til din model.",
  },
];

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Send din telefon ind til reparation med gratis fragtlabel",
  description: DESCRIPTION,
  step: STEPS.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.title,
    text: s.text,
    url: `${URL}#trin-${i + 1}`,
  })),
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
    { "@type": "ListItem", position: 2, name: "Reparation", item: "https://phonespot.dk/reparation" },
    { "@type": "ListItem", position: 3, name: "Send ind", item: URL },
  ],
};

export default function IndsendPage() {
  return (
    <>
      <JsonLd data={howToJsonLd} />
      <JsonLd data={faqJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <section className="bg-[#1A3D2E] py-20 md:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <p className="mb-4 text-sm font-semibold tracking-wide text-white/60">
            Reparation på afstand
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Send din telefon ind — gratis fragtlabel
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            Bor du langt fra en af vores butikker, eller har du ikke tid til at
            komme forbi? Book online, så mailer vi en gratis fragtlabel. Du
            afleverer pakken i en pakkeshop, og vi tager os af resten.
          </p>
          <div className="mt-10">
            <Link
              href="/reparation/booking"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
            >
              Book og vælg Send ind
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16" aria-labelledby="sadan-virker-det">
        <div className="mx-auto max-w-4xl px-4">
          <h2
            id="sadan-virker-det"
            className="font-display text-3xl font-bold tracking-tight text-[#111111]"
          >
            Sådan virker det
          </h2>
          <ol className="mt-10 divide-y divide-[#E5E5EA] border-y border-[#E5E5EA]">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                id={`trin-${i + 1}`}
                className="grid gap-4 py-7 md:grid-cols-[6rem_minmax(0,1fr)]"
              >
                <span className="font-display text-5xl font-bold leading-none text-[#1A3D2E]">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#111111]">{step.title}</h3>
                  <p className="mt-2 max-w-xl text-base leading-relaxed text-[#6E6E73]">
                    {step.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#F7F7F8] py-16" aria-labelledby="pakning">
        <div className="mx-auto grid max-w-4xl gap-10 px-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
              Før du sender
            </p>
            <h2
              id="pakning"
              className="font-display text-3xl font-bold tracking-tight text-[#111111]"
            >
              Sådan pakker du enheden
            </h2>
          </div>
          <ul className="space-y-3">
            {PACKING.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-[#E5E5EA] bg-white px-5 py-4 text-sm leading-relaxed text-[#111111]"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white py-16" aria-labelledby="garanti-indsend">
        <div className="mx-auto max-w-3xl px-4">
          <h2
            id="garanti-indsend"
            className="font-display text-3xl font-bold tracking-tight text-[#111111]"
          >
            Samme garanti som i butikken
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#6E6E73]">
            Telefon- og tabletreparationer har livstidsgaranti på arbejde og dele.
            Det gælder både, når du kommer forbi, og når du sender enheden ind.
            Garantien dækker ikke nye skader som fald eller væske, og behandling
            af vandskade har 3 måneders garanti.
          </p>
          <div className="mt-10 divide-y divide-[#E5E5EA] rounded-2xl border border-[#E5E5EA] bg-white">
            {FAQS.map((faq) => (
              <details key={faq.question} className="px-6 py-5">
                <summary className="cursor-pointer font-display text-base font-bold text-[#111111]">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#6E6E73]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#1A3D2E] py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Klar til at sende din enhed ind?
          </h2>
          <p className="mt-4 text-base text-white/75">
            Book online, vælg Send ind, og få fragtlabelen på mail.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/reparation/booking"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-[#1A3D2E] transition-all hover:bg-white/90 hover:shadow-lg"
            >
              Book reparation
            </Link>
            <Link
              href="/reparation"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Se priser
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

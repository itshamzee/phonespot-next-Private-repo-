import Link from "next/link";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { FilteredGrid, type TemplateWithStock } from "@/components/product/filtered-grid";

export interface CollectionFaq {
  question: string;
  answer: string;
}

interface CollectionDetailsProps {
  deviceType?: "phone" | "watch" | "ipad" | "laptop";
  guideTitle: string;
  faqTitle?: string;
  guideIntro: string;
  choices: { title: string; body: string }[];
  faqs: CollectionFaq[];
  serviceLink?: { href: string; label: string; body: string };
}

interface DeviceCollectionProps extends CollectionDetailsProps {
  templates: TemplateWithStock[];
  title: string;
  intro: string;
  collectionHeading: string;
  initialBrand?: string;
}

export function DeviceCollectionDetails({
  guideTitle,
  faqTitle = "Ofte stillede spørgsmål",
  guideIntro,
  choices,
  faqs,
  serviceLink,
  deviceType = "phone",
}: CollectionDetailsProps) {
  return (
    <>
      <section className="border-y border-[#DDE2DD] bg-[#F4F5F2] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.5fr)]">
            <div>
              <p className="text-xs font-semibold text-[#1A3D2E]">Fysisk stand</p>
              <h2 className="mt-2 font-body text-3xl font-semibold tracking-[-0.035em] text-[#202421]">Hvad betyder standen?</h2>
              <p className="mt-4 text-sm leading-6 text-[#566159]">Standen beskriver de kosmetiske brugsspor. Se den konkrete enheds batterioplysning og øvrige detaljer på produktsiden.</p>
              <Link href="/kvalitet" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[#1A3D2E]">Læs om vores kvalitet <span aria-hidden="true">&rarr;</span></Link>
            </div>
            <ConditionExplainer deviceType={deviceType} />
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div>
              <p className="text-xs font-semibold text-[#1A3D2E]">Vælg roligt</p>
              <h2 className="mt-2 font-body text-3xl font-semibold tracking-[-0.035em] text-[#202421]">{guideTitle}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#566159]">{guideIntro}</p>
              <div className="mt-8 divide-y divide-[#DDE2DD] border-y border-[#DDE2DD]">
                {choices.map((choice, index) => (
                  <div key={choice.title} className="grid gap-2 py-5 sm:grid-cols-[2rem_10rem_minmax(0,1fr)] sm:gap-4">
                    <span className="text-xs text-[#809083]">0{index + 1}</span>
                    <h3 className="font-body text-sm font-semibold text-[#202421]">{choice.title}</h3>
                    <p className="text-sm leading-6 text-[#566159]">{choice.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <aside className="self-start rounded-lg bg-[#1A3D2E] p-7 text-white">
              <p className="text-xs text-white/70">Vejle og Slagelse</p>
              <h2 className="mt-2 font-body text-3xl font-semibold tracking-[-0.035em]">Se den. Prøv den. Tag den med.</h2>
              <p className="mt-4 text-sm leading-6 text-white/75">Kom forbi en butik, hvis du vil se en enhed og have hjælp til at vælge.</p>
              <div className="mt-7 divide-y divide-white/20 border-y border-white/20">
                <Link href="/butik/vejle" className="flex min-h-12 items-center justify-between text-sm font-semibold">PhoneSpot Vejle <span aria-hidden="true">&rarr;</span></Link>
                <Link href="/butik/slagelse" className="flex min-h-12 items-center justify-between text-sm font-semibold">PhoneSpot Slagelse <span aria-hidden="true">&rarr;</span></Link>
              </div>
              {serviceLink && <div className="mt-7 border-t border-white/20 pt-6"><p className="text-sm leading-6 text-white/75">{serviceLink.body}</p><Link href={serviceLink.href} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold">{serviceLink.label} <span aria-hidden="true">&rarr;</span></Link></div>}
            </aside>
          </div>
        </div>
      </section>

      <section className="border-t border-[#DDE2DD] bg-[#F4F5F2] py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.3fr)]">
          <div><p className="text-xs font-semibold text-[#1A3D2E]">Spørgsmål og svar</p><h2 className="mt-2 font-body text-3xl font-semibold tracking-[-0.035em] text-[#202421]">{faqTitle}</h2></div>
          <div className="border-t border-[#BFC8C0]">{faqs.map((item) => <details key={item.question} className="group border-b border-[#BFC8C0]"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-semibold text-[#202421]">{item.question}<span aria-hidden="true" className="text-xl font-normal text-[#1A3D2E] group-open:rotate-45">+</span></summary><p className="max-w-2xl pb-5 text-sm leading-6 text-[#566159]">{item.answer}</p></details>)}</div>
        </div>
      </section>
    </>
  );
}

export function DeviceCollection({
  templates,
  title,
  intro,
  collectionHeading,
  guideTitle,
  faqTitle,
  guideIntro,
  choices,
  faqs,
  initialBrand,
  serviceLink,
  deviceType = "phone",
}: DeviceCollectionProps) {
  const modelLabel = `${templates.length} ${templates.length === 1 ? "model" : "modeller"}`;

  return (
    <>
      <section className="border-b border-[#DDE2DD] bg-[#F4F5F2]">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:py-10">
          <nav aria-label="Brødkrumme" className="mb-4 flex items-center gap-2 text-xs text-[#687069]">
            <Link href="/" className="hover:text-[#1A3D2E]">Forside</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#202421]">{title}</span>
          </nav>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] lg:items-end">
            <div>
              <h1 className="font-body text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#202421] sm:text-5xl">{title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#566159] sm:text-base">{intro}</p>
            </div>
            <div className="border-l border-[#BFC8C0] pl-4 text-sm text-[#566159]">
              <p className="font-semibold text-[#202421]">{modelLabel} i det aktuelle udvalg</p>
              <p className="mt-1">36 måneders garanti på enheder</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#DDE2DD] bg-white">
        <div className="mx-auto grid max-w-7xl gap-2 px-4 py-4 text-xs text-[#566159] sm:grid-cols-3 sm:gap-6 sm:text-sm">
          <p className="font-medium text-[#1A3D2E]">Testet og klargjort</p>
          <p>Batteriinfo på den enkelte enhed</p>
          <p>Butikker i Vejle og Slagelse</p>
        </div>
      </section>

      <section className="bg-white py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4">
          <FilteredGrid templates={templates} heading={collectionHeading} initialBrand={initialBrand} />
        </div>
      </section>

      <DeviceCollectionDetails
        deviceType={deviceType}
        guideTitle={guideTitle}
        faqTitle={faqTitle}
        guideIntro={guideIntro}
        choices={choices}
        faqs={faqs}
        serviceLink={serviceLink}
      />
    </>
  );
}

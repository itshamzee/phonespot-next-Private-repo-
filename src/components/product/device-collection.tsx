import Link from "next/link";
import Image from "next/image";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { FilteredGrid, type PromoSlot, type TemplateWithStock } from "@/components/product/filtered-grid";
import { DeviceCollectionHero, type CollectionKind } from "./device-collection-hero";
import styles from "./device-collection.module.css";

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
  collection?: CollectionKind;
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
      <section data-collection-section="condition" className="border-y border-[#DDE2DD] bg-[#F4F5F2] py-12 sm:py-16">
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
            <aside className="self-start overflow-hidden rounded-lg bg-[#1A3D2E] p-7 text-white">
              <Image src="/images/store/butik-indvendig.jpg" alt="En PhoneSpot-butik med telefoner og tilbehør" width={620} height={350} sizes="(min-width: 1024px) 480px, 100vw" className={styles.storePhoto} />
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

      <section data-collection-section="faq" className="border-t border-[#DDE2DD] bg-[#F4F5F2] py-12 sm:py-16">
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
  collection = deviceType === "phone" ? "iphone" : deviceType,
}: DeviceCollectionProps) {
  const editorialDevice = collection === "iphone" ? "iPhone" : collection === "ipad" ? "iPad" : undefined;
  const promos: PromoSlot[] | undefined = editorialDevice ? [
    { position: 2, variant: "trust", href: "/garanti", device: editorialDevice },
    { position: 5, variant: "accessories", href: "/tilbehoer", device: editorialDevice },
  ] : undefined;

  return (
    <div className={styles.collection} data-category={collection}>
      <DeviceCollectionHero collection={collection} title={title} intro={intro} modelCount={templates.length} />

      <section id="udvalg" className={styles.products} aria-label={collectionHeading}>
        <div className={styles.wrap}>
          <FilteredGrid templates={templates} heading={collectionHeading} initialBrand={initialBrand} promos={promos} />
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
    </div>
  );
}

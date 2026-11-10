import Link from "next/link";
import type { BlogCta } from "@/lib/blog";
import { PHONESPOT_PROMISES } from "@/lib/promises";
import { REPAIR_WARRANTY_TERMS } from "@/lib/repairs/warranty-copy";
import { QUALITY_BLURB, QUALITY_LABEL, QUALITY_ORDER } from "@/components/repair/service-label";

/**
 * Fast gennemsigtighedsblok i bunden af hver artikel (ejerønske 10/11-2026:
 * "komplet gennemsigtighed med kunden"). Teksten kommer fra de samme kilder
 * som resten af sitet (kvaliteter, garanti, løfter), så den aldrig glider.
 */

type Row = { label: string; text: string; href?: string; linkLabel?: string };

const REPAIR_ROWS: Row[] = [
  {
    label: "Pris",
    text: "Prisen står på siden for din model og er fast, før vi går i gang. Et hurtigt tjek ved disken er gratis; en fuld diagnose koster 249 kr.",
    href: "/reparation",
    linkLabel: "Find din model",
  },
  {
    label: "Tid",
    text: "90 % af skærm- og batteriskift er klar på 30 minutter, når delen er på lager. Reparationer med lodning, fx ladestik på iPad og HDMI-port på konsoller, tager 2-3 hverdage, og du får besked, når enheden er klar.",
  },
  {
    label: "Garanti",
    text: `${REPAIR_WARRANTY_TERMS[0].text} ${REPAIR_WARRANTY_TERMS[2].text} ${REPAIR_WARRANTY_TERMS[1].text}`,
    href: "/garanti",
    linkLabel: "Læs garantien",
  },
  {
    label: "Dine data",
    text: "Vi rører ikke dine data ved en reparation. Tag alligevel en sikkerhedskopi, før du afleverer.",
  },
];

const BUYBACK_ROWS: Row[] = [
  {
    label: "1. Gratis label",
    text: "Siger du ja til tilbuddet, sender vi en gratis fragtlabel. Du kan også aflevere i Vejle eller Slagelse.",
  },
  {
    label: "2. Vi modtager",
    text: "Vi tjekker, at enheden svarer til din beskrivelse. Gør den ikke, får du et nyt tilbud, eller vi sender den gratis retur.",
  },
  {
    label: "3. Du får pengene",
    text: "Samme dag, som vi modtager enheden, på den konto du oplyser.",
  },
  {
    label: "Fast pris",
    text: "Prisen i tilbuddet holder, medmindre enheden afviger fra din beskrivelse. Du binder dig ikke ved at spørge.",
    href: "/saelg-din-enhed",
    linkLabel: "Få et tilbud",
  },
  {
    label: "Dine data",
    text: "Nulstil enheden og log ud af iCloud eller Google før salg. Er du i tvivl, hjælper vi dig ved disken.",
  },
];

const BUY_ROWS: Row[] = PHONESPOT_PROMISES.filter((p) => !/opkøb|værksted/i.test(p.title)).map((p) => ({
  label: p.title,
  text: p.detail,
  href: p.href,
  linkLabel: "Læs mere",
}));

const CONTENT: Record<BlogCta, { title: string; intro: string; rows: Row[] }> = {
  reparation: {
    title: "Sådan arbejder vi med reparation",
    intro: "Du skal vide, hvad du betaler for, før vi går i gang. Her er det hele.",
    rows: REPAIR_ROWS,
  },
  saelg: {
    title: "Sådan foregår opkøb",
    intro: "Ingen små bogstaver. Sådan går det til, når du sælger din enhed til os.",
    rows: BUYBACK_ROWS,
  },
  koeb: {
    title: "Det lover vi, når du køber",
    intro: "Det her gælder alle brugte enheder, vi sælger.",
    rows: BUY_ROWS,
  },
};

export function TransparencyPanel({ cta }: { cta: BlogCta }) {
  const content = CONTENT[cta];
  return (
    <section aria-labelledby="gennemsigtighed" className="not-prose mt-20 border-t-2 border-charcoal pt-8">
      <p className="font-body text-sm font-semibold text-[#1A3D2E]">Gennemsigtighed</p>
      <h2 id="gennemsigtighed" className="mt-2 font-display text-[30px] font-bold leading-tight tracking-tight text-charcoal">
        {content.title}
      </h2>
      <p className="mt-3 max-w-xl font-body text-[17px] leading-relaxed text-charcoal/70">{content.intro}</p>

      {cta === "reparation" && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[520px] table-fixed border-collapse text-left font-body text-[15px]">
            <caption className="mb-3 text-left font-body text-sm font-semibold text-charcoal">
              Du vælger selv kvaliteten på skærme og dele
            </caption>
            <thead>
              <tr className="border-b border-charcoal/15">
                {QUALITY_ORDER.map((tier) => (
                  <th key={tier} scope="col" className="py-2 pr-4 font-display text-lg font-bold text-[#1A3D2E]">
                    {QUALITY_LABEL[tier]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {QUALITY_ORDER.map((tier) => (
                  <td key={tier} className="py-3 pr-4 align-top leading-relaxed text-charcoal/80">
                    {QUALITY_BLURB[tier]}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-charcoal/10">
                {QUALITY_ORDER.map((tier) => (
                  <td key={tier} className="py-3 pr-4 align-top font-semibold leading-relaxed text-charcoal">
                    Livstidsgaranti på arbejde og dele
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="mt-3 font-body text-sm leading-relaxed text-charcoal/60">
            Garantien er den samme på alle tre kvaliteter. Det, der skiller dem ad, er delen og prisen. På nyere
            iPhones viser iOS en besked om en ukendt del, hvis skærmen ikke er original. Det fortæller vi dig, før du
            vælger.
          </p>
        </div>
      )}

      <dl className="mt-8 divide-y divide-charcoal/10 border-y border-charcoal/10">
        {content.rows.map((row) => (
          <div key={row.label} className="grid gap-1 py-5 sm:grid-cols-[170px_1fr] sm:gap-6">
            <dt className="font-body text-[15px] font-semibold text-charcoal">{row.label}</dt>
            <dd className="font-body text-[16px] leading-relaxed text-charcoal/75">
              {row.text}
              {row.href && (
                <>
                  {" "}
                  <Link href={row.href} className="font-semibold text-[#1A3D2E] underline underline-offset-2">
                    {row.linkLabel}
                  </Link>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

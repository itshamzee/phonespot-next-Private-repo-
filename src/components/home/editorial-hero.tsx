import Image from "next/image";
import Link from "next/link";
import { Barlow_Condensed, DM_Sans } from "next/font/google";

// Scope the agreed typography to this section; the legacy font exports use
// Plus Jakarta Sans despite their names. Site-wide typography is separate work.
const display = Barlow_Condensed({ subsets: ["latin"], weight: "600", display: "swap" });
const body = DM_Sans({ subsets: ["latin"], display: "swap" });

const categories = [
  ["iPhones", "/iphones"],
  ["iPads", "/ipads"],
  ["MacBooks og bærbare", "/baerbare"],
  ["Smartwatches", "/smartwatches"],
  ["Tilbehør", "/tilbehoer"],
  ["Beskyttelsesglas", "/beskyttelsesglas"],
  ["Reservedele", "/reservedele"],
  ["Reparation", "/reparation"],
] as const;

const textLink = "inline-flex min-h-11 items-center py-2 text-green-eco underline decoration-green-eco/30 underline-offset-4 hover:decoration-green-eco focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-eco";

export function EditorialHero() {
  return (
    <div className={body.className}>
      <section aria-labelledby="home-heading" className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6 md:pt-12">
          <h1
            id="home-heading"
            className={`${display.className} max-w-5xl text-[clamp(3.25rem,7.5vw,7rem)] leading-[0.95] tracking-[-0.025em] text-charcoal`}
          >
            Din næste iPhone.<br />
            Grundigt testet.
          </h1>

          <div className="mt-7 grid gap-7 pb-8 md:mt-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-center md:gap-10 md:pb-10 lg:gap-14">
            <div className="md:col-start-2 md:row-start-1">
              <p className="max-w-sm text-base leading-relaxed text-charcoal-light md:text-lg">
                Refurbished iPhones med 36 måneders garanti.
                Testet, rengjort og klar til brug.
              </p>
              <Link
                href="/iphones"
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-sm bg-green-eco px-7 py-3.5 text-base font-semibold text-white hover:bg-green-light focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-eco sm:w-auto"
              >
                Se iPhones
              </Link>
              <div className="mt-2">
                <Link href="/kvalitet" className={`${textLink} text-sm`}>
                  Sådan vurderer vi standen
                </Link>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-charcoal-light md:mt-8">
                Vælg model og stand i udvalget. Du kan også besøge os i Vejle og Slagelse.
              </p>
            </div>

            <figure className="min-w-0 md:col-start-1 md:row-start-1">
              <div className="relative aspect-[4/3] overflow-hidden bg-charcoal md:aspect-[3/2]">
                <Image
                  src="/blog/covers/iphone-pro-dark.jpg"
                  alt="Nærfoto af kameraet og bagsiden på en iPhone"
                  fill
                  priority
                  sizes="(min-width: 1280px) 780px, (min-width: 768px) 63vw, 100vw"
                  className="object-cover object-[50%_48%]"
                />
              </div>
              <figcaption className="mt-2 text-xs leading-relaxed text-charcoal-light">
                Stand og tilgængelighed fremgår af den enkelte vare.
              </figcaption>
            </figure>
          </div>

          <nav aria-label="Produktkategorier og reparation" className="border-t border-sand py-4 md:py-5">
            <ul className="flex flex-wrap gap-x-6 gap-y-1 md:gap-x-8">
              {categories.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center py-2 text-sm font-medium text-charcoal hover:text-green-eco hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-eco md:text-base"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <section aria-labelledby="home-store-heading" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:items-center md:gap-14 md:px-6 md:py-16">
          <div>
            <h2 id="home-store-heading" className={`${display.className} max-w-md text-4xl leading-[1.05] tracking-tight text-charcoal md:text-5xl`}>
              En webshop.<br />
              Og en butik, du kan gå ind i.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-charcoal-light">
              Vil du se standen, før du vælger? Besøg PhoneSpot i Vejle
              eller Slagelse. Vi hjælper dig med at finde en enhed og
              tilbehør, der passer til dig.
            </p>
            <Link href="/butik" className={`${textLink} mt-4 font-medium`}>
              Find din butik
            </Link>
          </div>
          <Image
            src="/images/store/butik-indvendig.jpg"
            alt="Indenfor hos PhoneSpot med disk, montre og tilbehør"
            width={1600}
            height={1200}
            sizes="(min-width: 1280px) 665px, (min-width: 768px) 55vw, 100vw"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      </section>
    </div>
  );
}

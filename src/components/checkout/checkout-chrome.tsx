import Link from "next/link";
import Image from "next/image";
import { STORES } from "@/lib/store-config";
import { LEGAL_ENTITY } from "@/lib/company";

const PHONE = STORES.vejle.phone;
const PHONE_HREF = `tel:${PHONE.replace(/\s/g, "")}`;

/**
 * Slank top til kassen: logo, hjælp på telefon og vej tilbage. Ingen menu,
 * søgning, kampagnebjælke eller chatboble, så kunden ikke ledes væk midt i
 * betalingen.
 */
export function CheckoutHeader() {
  return (
    <header className="border-b border-sand bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="PhoneSpot, til forsiden" className="shrink-0">
          <Image src="/brand/logo.svg" alt="PhoneSpot" width={146} height={28} priority />
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <a href={PHONE_HREF} className="hidden text-charcoal hover:underline sm:inline">
            Brug for hjælp? <span className="font-semibold">{PHONE}</span>
          </a>
          <a href={PHONE_HREF} className="font-semibold text-charcoal sm:hidden" aria-label={`Ring til os på ${PHONE}`}>
            {PHONE}
          </a>
          <Link href="/" className="hidden text-gray hover:text-charcoal md:inline">
            Tilbage til butikken
          </Link>
        </div>
      </div>
    </header>
  );
}

export function CheckoutFooter() {
  return (
    <footer className="border-t border-sand bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 text-xs text-gray">
        <p>
          {LEGAL_ENTITY.name}, CVR {LEGAL_ENTITY.cvr}. Butikker i Vejle og Slagelse.
        </p>
        <nav className="flex gap-4" aria-label="Vilkår">
          <Link href="/handelsbetingelser" className="hover:text-charcoal hover:underline">Handelsbetingelser</Link>
          <Link href="/privatlivspolitik" className="hover:text-charcoal hover:underline">Privatlivspolitik</Link>
          <Link href="/kontakt" className="hover:text-charcoal hover:underline">Kontakt</Link>
        </nav>
      </div>
    </footer>
  );
}

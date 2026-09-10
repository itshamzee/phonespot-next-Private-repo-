import Image from "next/image";
import Link from "next/link";
import { STORES, COMPANY_EMAIL } from "@/lib/store-config";
import { VisaIcon, MastercardIcon, MobilePayIcon, ApplePayIcon, KlarnaIcon } from "@/components/ui/payment-icons";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";
import { TRUSTPILOT_SCORE_LABEL_DA } from "@/lib/trustpilot/constants";

const PRODUCT_LINKS = [
  { label: "iPhones", href: "/iphones" },
  { label: "Smartphones", href: "/smartphones" },
  { label: "iPads", href: "/ipads" },
  { label: "Bærbare", href: "/baerbare" },
  { label: "Smartwatches", href: "/smartwatches" },
  { label: "Reservedele", href: "/reservedele" },
  { label: "Reparation", href: "/reparation" },
] as const;

const SERVICE_LINKS = [
  { label: "Kvalitet", href: "/kvalitet" },
  { label: "Garanti", href: "/garanti" },
  { label: "Forsikring", href: "/forsikring" },
  { label: "Delbetaling", href: "/delbetaling" },
  { label: "Reparation", href: "/reparation" },
  { label: "Butik", href: "/butik" },
  { label: "Reklamation", href: "/reklamation" },
  { label: "Kontakt", href: "/kontakt" },
] as const;

const INFO_LINKS = [
  { label: "Om os", href: "/om-os" },
  { label: "FAQ", href: "/faq" },
  { label: "Hvorfor PhoneSpot", href: "/hvorfor-phonespot" },
  { label: "Blog", href: "/blog" },
  { label: "Sammenligninger", href: "/sammenlign" },
] as const;

const LEGAL_LINKS = [
  { label: "Privatlivspolitik", href: "/privatlivspolitik" },
  { label: "Handelsbetingelser", href: "/handelsbetingelser" },
  { label: "Cookies", href: "/cookies" },
] as const;

function TrustpilotBadge() {
  return (
    <a
      href="https://dk.trustpilot.com/review/phonespot.dk"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80"
      aria-label={`Se PhoneSpot på Trustpilot — ${TRUSTPILOT_SCORE_LABEL_DA} stjerner`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#00b67a]" fill="currentColor" aria-hidden="true">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] font-semibold text-white">Trustpilot</span>
        <div className="flex items-center gap-1">
          <div className="flex">
            {[1, 2, 3, 4].map((i) => (
              <svg key={i} viewBox="0 0 24 24" className="h-3 w-3 text-[#00b67a]" fill="currentColor" aria-hidden="true">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            ))}
            <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
              <defs>
                <linearGradient id="footer-half-star">
                  <stop offset="70%" stopColor="#00b67a" />
                  <stop offset="70%" stopColor="#4a4d48" />
                </linearGradient>
              </defs>
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="url(#footer-half-star)" />
            </svg>
          </div>
          <span className="text-[11px] font-semibold text-white/70">{TRUSTPILOT_SCORE_LABEL_DA}</span>
        </div>
      </div>
    </a>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function NavColumn({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-body text-xs font-semibold text-white/80">
        {heading}
      </h3>
      <ul className="mt-4 flex flex-col gap-2">
        {children}
      </ul>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="text-[13px] text-[#86868B] transition-colors duration-150 hover:text-white"
      >
        {label}
      </Link>
    </li>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
      {/* Main footer */}
      <footer className="bg-[#111111] text-white">
        {/* Primary content */}
        <div className="mx-auto max-w-7xl px-4 pt-14 pb-10 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 md:grid-cols-3 lg:grid-cols-6 lg:gap-10">

            {/* Brand / store column */}
            <div className="col-span-2 md:col-span-3 lg:col-span-2">
              <Image
                src="/brand/logos/phonespot-wordmark-white.png"
                alt="PhoneSpot"
                width={200}
                height={38}
                className="h-auto w-[200px]"
              />
              <p className="mt-4 max-w-[260px] text-[13px] leading-relaxed text-[#86868B]">
                Danmarks specialist i kvalitetstestet refurbished tech. Alle refurbished
                enheder leveres med 36 måneders garanti, og alle ordrer har 14 dages returret.
              </p>

              {/* Store info block */}
              <div className="mt-6 space-y-2.5">
                {[STORES.slagelse, STORES.vejle].map((store) => (
                  <div key={store.slug} className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mt-px h-3.5 w-3.5 shrink-0 text-[#1A3D2E]" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    <span className="text-[12px] leading-relaxed text-[#86868B]">
                      {store.name}<br />
                      {store.street}, {store.zip} {store.city}<br />
                      Man–Fre {store.hours.weekdays} &middot; Lør–Søn {store.hours.saturday}
                    </span>
                  </div>
                ))}

                <a
                  href={`tel:${STORES.slagelse.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 shrink-0 text-[#1A3D2E]" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                  <span className="text-[12px] text-[#86868B] transition-colors duration-150 group-hover:text-white">
                    {STORES.slagelse.phone}
                  </span>
                </a>

                <a
                  href={`mailto:${COMPANY_EMAIL}`}
                  className="flex items-center gap-2 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 shrink-0 text-[#1A3D2E]" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  <span className="text-[12px] text-[#86868B] transition-colors duration-150 group-hover:text-white">
                    {COMPANY_EMAIL}
                  </span>
                </a>
              </div>

              {/* Social + trust badges */}
              <div className="mt-6 flex items-center gap-4">
                <a
                  href="https://www.facebook.com/phonespot.dk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#86868B] transition-colors duration-150 hover:text-white"
                  aria-label="PhoneSpot på Facebook"
                >
                  <FacebookIcon />
                  <span className="text-[12px]">Facebook</span>
                </a>

                <div className="h-3.5 w-px bg-white/10" aria-hidden="true" />

                <TrustpilotBadge />

                <div className="h-3.5 w-px bg-white/10" aria-hidden="true" />

                <a
                  href="https://www.emaerket.dk"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="e-mærket certificeret"
                >
                  <Image
                    src="/emaerket.png"
                    alt="e-mærket certificeret"
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-md opacity-90 transition-opacity hover:opacity-100"
                  />
                </a>
              </div>

              {/* Partner — Storstrøm Forsikring */}
              <div className="mt-6">
                <p className="font-body text-xs font-semibold text-white/80">
                  I samarbejde med
                </p>
                <Link
                  href="/forsikring"
                  className="mt-2 inline-block"
                  aria-label="Elektronikforsikring i samarbejde med Storstrøm Forsikring"
                >
                  <Image
                    src="/brand/partners/storstrom-forsikring-white.svg"
                    alt="Storstrøm Forsikring"
                    width={862}
                    height={249}
                    className="h-6 w-auto opacity-75 transition-opacity hover:opacity-100"
                  />
                </Link>
              </div>
            </div>

            {/* Nav columns */}
            <NavColumn heading="Produkter">
              {PRODUCT_LINKS.map((link) => (
                <NavLink key={link.href} href={link.href} label={link.label} />
              ))}
            </NavColumn>

            <NavColumn heading="Service">
              {SERVICE_LINKS.map((link) => (
                <NavLink key={link.href} href={link.href} label={link.label} />
              ))}
            </NavColumn>

            <NavColumn heading="Information">
              {INFO_LINKS.map((link) => (
                <NavLink key={link.href} href={link.href} label={link.label} />
              ))}
            </NavColumn>

            <NavColumn heading="Juridisk">
              {LEGAL_LINKS.map((link) => (
                <NavLink key={link.href} href={link.href} label={link.label} />
              ))}
              <li>
                <CookieSettingsButton />
              </li>
            </NavColumn>
          </div>

          {/* Divider */}
          <div className="mt-12 h-px bg-white/[0.07]" aria-hidden="true" />

          {/* Newsletter */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-body text-xs font-semibold text-white/80">
                Nyhedsbrev
              </h3>
              <p className="mt-1.5 text-[13px] text-[#86868B]">
                Få eksklusive tilbud og nyheder direkte i din indbakke.
              </p>
            </div>
            <form
              action="/api/newsletter"
              method="POST"
              className="flex flex-col sm:flex-row gap-2 sm:shrink-0"
            >
              <input
                name="email"
                aria-label="Din e-mailadresse"
                type="email"
                required
                placeholder="Din e-mailadresse"
                className="w-full rounded-full border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-[13px] text-white placeholder:text-white/25 focus:border-white/20 focus:bg-white/[0.08] focus:outline-none sm:w-56"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-[#1A3D2E] px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
              >
                Tilmeld
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.07]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
            <p className="text-[11px] text-[#86868B]">
              &copy; {year} PhoneSpot ApS &middot; CVR: 38688766
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#86868B]/60">Betaling:</span>
              <div className="flex items-center gap-1.5">
                <VisaIcon className="h-5 w-auto rounded-[3px]" />
                <MastercardIcon className="h-5 w-auto rounded-[3px]" />
                <MobilePayIcon className="h-5 w-auto rounded-[3px]" />
                <ApplePayIcon className="h-5 w-auto rounded-[3px]" />
                <KlarnaIcon className="h-5 w-auto rounded-[3px]" />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

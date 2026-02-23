import Image from "next/image";
import Link from "next/link";

const PRODUCT_LINKS = [
  { label: "iPhones", href: "/iphones" },
  { label: "iPads", href: "/ipads" },
  { label: "Bærbare", href: "/baerbare" },
  { label: "Covers", href: "/covers" },
  { label: "Reservedele", href: "/reservedele" },
  { label: "Outlet", href: "/outlet" },
] as const;

const SERVICE_LINKS = [
  { label: "Kvalitet", href: "/kvalitet" },
  { label: "Reparation", href: "/reparation" },
  { label: "Reklamation", href: "/reklamation" },
  { label: "Kontakt", href: "/kontakt" },
] as const;

const INFO_LINKS = [
  { label: "Om os", href: "/om-os" },
  { label: "FAQ", href: "/faq" },
  { label: "Hvorfor PhoneSpot", href: "/hvorfor-phonespot" },
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
      className="inline-flex items-center gap-3 rounded-2xl bg-white/[0.06] px-5 py-3 transition-colors hover:bg-white/10"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#00b67a]" fill="currentColor" aria-hidden="true">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-bold text-white">Trustpilot</span>
        <div className="flex items-center gap-1.5">
          <div className="flex">
            {[1, 2, 3, 4].map((i) => (
              <svg key={i} viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#00b67a]" fill="currentColor" aria-hidden="true">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            ))}
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
              <defs>
                <linearGradient id="footer-half-star">
                  <stop offset="40%" stopColor="#00b67a" />
                  <stop offset="40%" stopColor="#4a4d48" />
                </linearGradient>
              </defs>
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="url(#footer-half-star)" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">4.4</span>
        </div>
      </div>
    </a>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-charcoal text-white">
      {/* Trust badges row */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-6 px-4 py-8 md:justify-between lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {[
              { icon: "shield", text: "36 mdr. garanti" },
              { icon: "return", text: "14 dages returret" },
              { icon: "truck", text: "1-2 dages levering" },
              { icon: "check", text: "30+ kvalitetstests" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2">
                {item.icon === "shield" && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-green-eco" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                )}
                {item.icon === "return" && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-green-eco" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                  </svg>
                )}
                {item.icon === "truck" && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-green-eco" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                )}
                {item.icon === "check" && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-green-eco" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
                <span className="text-sm font-medium text-white/70">{item.text}</span>
              </div>
            ))}
          </div>
          <TrustpilotBadge />
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-6">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Image
              src="/brand/logos/phonespot-wordmark-white.svg"
              alt="PhoneSpot"
              width={140}
              height={32}
              className="h-8 w-auto"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              Danmarks specialist i kvalitetstestet refurbished tech. Alle produkter
              leveres med 36 måneders garanti og 14 dages returret.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a href="https://www.emaerket.dk" target="_blank" rel="noopener noreferrer">
                <Image src="/emaerket.png" alt="e-mærket certificeret" width={48} height={48} className="h-12 w-12 rounded-lg" />
              </a>
            </div>
          </div>

          {/* Produkter column */}
          <div>
            <h3 className="font-display text-[11px] font-semibold uppercase tracking-[3px] text-white/40">
              Produkter
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Service column */}
          <div>
            <h3 className="font-display text-[11px] font-semibold uppercase tracking-[3px] text-white/40">
              Service
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {SERVICE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Information column */}
          <div>
            <h3 className="font-display text-[11px] font-semibold uppercase tracking-[3px] text-white/40">
              Information
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {INFO_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Juridisk column */}
          <div>
            <h3 className="font-display text-[11px] font-semibold uppercase tracking-[3px] text-white/40">
              Juridisk
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter mini */}
        <div className="mt-12 rounded-2xl bg-white/[0.04] p-6 md:flex md:items-center md:justify-between md:p-8">
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Tilmeld dig vores nyhedsbrev
            </h3>
            <p className="mt-1 text-sm text-white/50">
              Få eksklusive tilbud og nyheder direkte i din indbakke.
            </p>
          </div>
          <form
            action="/api/newsletter"
            method="POST"
            className="mt-4 flex gap-3 md:mt-0"
          >
            <input
              name="email"
              type="email"
              required
              placeholder="Din email"
              className="w-full rounded-full bg-white/10 px-5 py-2.5 text-sm text-white placeholder:text-white/40 focus:bg-white/15 focus:outline-none md:w-64"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-green-eco px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Tilmeld
            </button>
          </form>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 lg:px-8">
          <p className="text-xs text-white/30">
            &copy; {year} PhoneSpot ApS &middot; CVR: XXXXXXXX &middot; Alle rettigheder forbeholdes.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30">Betalingsmuligheder:</span>
            <div className="flex items-center gap-2">
              {["Visa", "Mastercard", "MobilePay"].map((method) => (
                <span key={method} className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50">
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";

const PRODUCT_LINKS = [
  { label: "iPhones", href: "/iphones" },
  { label: "iPads", href: "/ipads" },
  { label: "Smartphones", href: "/smartphones" },
  { label: "Bærbare", href: "/baerbare" },
  { label: "Covers", href: "/covers" },
  { label: "Outlet", href: "/outlet" },
] as const;

const SERVICE_LINKS = [
  { label: "Kvalitet", href: "/kvalitet" },
  { label: "Reparation", href: "/reparation" },
  { label: "Reklamation", href: "/reklamation" },
  { label: "Kontakt", href: "/kontakt" },
  { label: "Reservedele", href: "/reservedele" },
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

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="ps-pattern-dots-dark bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <img
              src="/brand/logos/phonespot-wordmark-white.svg"
              alt="PhoneSpot"
              width={140}
              height={32}
            />
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Kvalitetstestede iPhones og iPads med 24 måneders garanti.
            </p>
            <div className="mt-6">
              <img
                src="/emaerket.png"
                alt="e-mærket"
                width={60}
                height={60}
              />
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
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 lg:px-8">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[2px] text-white/35">
            &copy; {year} PhoneSpot ApS. Alle rettigheder forbeholdes.
          </p>
        </div>
      </div>
    </footer>
  );
}

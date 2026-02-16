import Link from "next/link";

const PRODUCT_LINKS = [
  { label: "iPhones", href: "/iphones" },
  { label: "iPads", href: "/ipads" },
  { label: "Computere", href: "/computere" },
  { label: "Covers", href: "/covers" },
  { label: "Reservedele", href: "/reservedele" },
  { label: "Tilbehor", href: "/tilbehor" },
] as const;

const SERVICE_LINKS = [
  { label: "Reparation", href: "/reparation" },
  { label: "Hvorfor PhoneSpot?", href: "/hvorfor-phonespot" },
  { label: "FAQ", href: "/faq" },
  { label: "Kontakt", href: "/kontakt" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="ps-pattern-dots-dark bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <img
              src="/brand/logos/phonespot-wordmark-white.svg"
              alt="PhoneSpot"
              width={140}
              height={32}
            />
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Kvalitetstestede iPhones og iPads med 12 maneders garanti.
            </p>
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

          {/* Sikker handel column */}
          <div>
            <h3 className="font-display text-[11px] font-semibold uppercase tracking-[3px] text-white/40">
              Sikker handel
            </h3>
            <div className="mt-4">
              <img
                src="/emaerket.png"
                alt="e-maerket"
                width={60}
                height={60}
              />
            </div>
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

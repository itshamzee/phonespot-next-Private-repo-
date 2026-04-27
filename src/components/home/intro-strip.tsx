import Link from "next/link";

const USPS = [
  { label: "Spar op til 40%" },
  { label: "30+ kvalitetstests" },
  { label: "36 mdr. garanti" },
  { label: "80% mindre CO₂" },
];

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 text-green-eco"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function StarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2l2.4 7.2H22l-6 4.5 2.3 7.3L12 16.6 5.7 21l2.3-7.3-6-4.5h7.6z" />
    </svg>
  );
}

export function IntroStrip() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-8 md:px-6 md:pt-14 md:pb-10">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto] md:gap-12">
          {/* Left: brand voice */}
          <div>
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-green-eco">
              Refurbished tech &middot; Danmark
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-charcoal sm:text-5xl md:text-[3.5rem] lg:text-[4rem]">
              Refurbished tech<br />med 36 mdr. garanti
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-gray md:text-[16px]">
              Kvalitetstestet, rengjort og klar til brug — fra Danmarks højest bedømte
              refurb-butik. To fysiske butikker i Slagelse og Vejle.
            </p>
          </div>

          {/* Right: Trustpilot */}
          <a
            href="https://dk.trustpilot.com/review/phonespot.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full items-center gap-4 rounded-2xl border border-sand bg-cream p-4 transition-all hover:border-green-eco hover:bg-white sm:w-auto md:flex-col md:items-start md:p-6"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray">
                Trustpilot
              </span>
              <div className="flex items-center gap-1 text-[#00B67A]">
                <StarIcon />
                <StarIcon />
                <StarIcon />
                <StarIcon />
                <StarIcon />
              </div>
            </div>
            <div className="border-l border-sand pl-4 md:border-l-0 md:pl-0 md:pt-2">
              <p className="font-display text-3xl font-extrabold leading-none text-charcoal md:text-4xl">
                4,7
              </p>
              <p className="mt-1.5 text-[12px] font-medium tracking-tight text-gray group-hover:text-green-eco">
                Bedømmelse på Trustpilot &rarr;
              </p>
            </div>
          </a>
        </div>

        {/* USP row */}
        <ul
          role="list"
          className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-sand pt-5 md:flex md:flex-wrap md:items-center md:gap-x-8 md:gap-y-2"
        >
          {USPS.map((usp) => (
            <li key={usp.label} className="flex items-center gap-2">
              <CheckIcon />
              <span className="text-[13px] font-medium tracking-tight text-charcoal">{usp.label}</span>
            </li>
          ))}
          <li className="md:ml-auto">
            <Link
              href="/hvorfor-phonespot"
              className="text-[12px] font-semibold tracking-tight text-green-eco hover:underline"
            >
              Hvorfor PhoneSpot? &rarr;
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}

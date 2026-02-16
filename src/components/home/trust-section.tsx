const features = [
  {
    title: "12 mdr. garanti",
    description:
      "Alle produkter leveres med 12 m\u00e5neders garanti. Tryg handel hver gang.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Kvalitetstestet",
    description:
      "Hvert produkt gennemg\u00e5r 30+ tests for batteri, sk\u00e6rm, kamera og mere.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: "Hurtig levering",
    description:
      "Bestil f\u00f8r kl. 15 og f\u00e5 din pakke allerede n\u00e6ste hverdag.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
];

export function TrustSection() {
  return (
    <section id="trust" className="bg-green-pale py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-12 text-center font-display text-3xl font-bold italic text-charcoal">
          Hvorfor v&aelig;lge PhoneSpot?
        </h2>
        <div className="grid gap-8 md:grid-cols-3 md:gap-12">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[12px] bg-green-eco/10 text-green-eco">
                {feature.icon}
              </div>
              <h3 className="mb-2 font-display text-xl font-bold text-charcoal">
                {feature.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-gray">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

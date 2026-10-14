import Link from "next/link";

type Entry = {
  heading: string;
  text?: string;
  links: { href: string; label: string }[];
};

const TEXT = {
  vejle: {
    android:
      "Samsung Galaxy, Google Pixel og OnePlus repareres på værkstedet i Vejle. Skærmskift og batteriskift er ofte klar på 30 minutter, når delen er på lager, og du får livstidsgaranti på arbejde og dele.",
    tablet:
      "iPad, Samsung Galaxy Tab og andre tablets: knust glas, svagt batteri eller en tablet, der ikke vil lade. Du får en fast pris, før vi går i gang, og livstidsgaranti på arbejde og dele.",
    macbook:
      "MacBook Air og MacBook Pro: batteri, skærm, tastatur og ladestik. Kom forbi ved disken, så kigger vi på maskinen. Vilkår og pris aftaler vi, før vi begynder.",
  },
  slagelse: {
    android:
      "Samsung Galaxy, Google Pixel og OnePlus repareres i VestsjællandsCentret. Skærmskift og batteriskift er ofte klar på 30 minutter, når delen er på lager, og du får livstidsgaranti på arbejde og dele.",
    tablet: undefined,
    macbook: undefined,
  },
} as const;

export function CityCategorySections({ store }: { store: "vejle" | "slagelse" }) {
  const city = store === "vejle" ? "Vejle" : "Slagelse";
  const t = TEXT[store];
  const entries: Entry[] = [
    {
      heading: `Samsung og Android i ${city}`,
      text: t.android,
      links: [
        { href: "/reparation/samsung", label: "Samsung-reparation" },
        { href: "/reparation/android", label: "Alle Android-mærker" },
      ],
    },
    {
      heading: `iPad og tablets i ${city}`,
      text: t.tablet,
      links: [
        { href: "/reparation/ipad", label: "iPad-reparation" },
        { href: "/reparation/tablet", label: "Alle tablets" },
      ],
    },
    {
      heading: `MacBook i ${city}`,
      text: t.macbook,
      links: [{ href: "/reparation/macbook", label: "MacBook-reparation" }],
    },
  ];

  return (
    <section className="bg-white py-14" aria-labelledby="efter-enhed">
      <div className="mx-auto max-w-3xl px-4">
        <h2
          id="efter-enhed"
          className="font-display text-2xl font-bold tracking-tight text-[#111111]"
        >
          Reparation i {city} efter enhed
        </h2>
        <div className="mt-6 divide-y divide-[#E5E5EA] border-y border-[#E5E5EA]">
          {entries.map((entry) => (
            <div key={entry.heading} className="py-5">
              <h3 className="font-display text-lg font-bold text-[#111111]">{entry.heading}</h3>
              {entry.text && (
                <p className="mt-2 text-base leading-relaxed text-[#6E6E73]">{entry.text}</p>
              )}
              <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold text-[#1A3D2E]">
                {entry.links.map((l) => (
                  <Link key={l.href} href={l.href} className="underline underline-offset-4">
                    {l.label}
                  </Link>
                ))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

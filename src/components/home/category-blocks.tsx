import Link from "next/link";
import { FadeIn } from "@/components/ui/fade-in";

const categories = [
  {
    name: "iPhones",
    href: "/iphones",
    description: "Fra iPhone 12 til 16 Pro Max",
  },
  {
    name: "iPads",
    href: "/ipads",
    description: "iPad, Air, Pro & Mini",
  },
  {
    name: "Computere",
    href: "/computere",
    description: "B\u00e6rbare & station\u00e6re",
  },
  {
    name: "Covers",
    href: "/covers",
    description: "Covers, sleeves & beskyttelse",
  },
  {
    name: "Reservedele",
    href: "/reservedele",
    description: "Sk\u00e6rme, batterier & mere",
  },
  {
    name: "Outlet",
    href: "/outlet",
    description: "Spar ekstra p\u00e5 udvalgte produkter",
    isOutlet: true,
  },
] as const;

export function CategoryBlocks() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
      <h2 className="mb-8 font-display text-3xl font-bold italic text-charcoal">
        Kategorier
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {categories.map((cat, index) => (
          <FadeIn key={cat.href} delay={index * 0.1}>
            <Link
              href={cat.href}
              className={`group block rounded-[16px] p-6 transition-shadow hover:shadow-md ${
                "isOutlet" in cat && cat.isOutlet
                  ? "bg-green-eco text-white"
                  : "bg-cream text-charcoal"
              }`}
            >
              <h3 className="font-display text-2xl font-bold">{cat.name}</h3>
              <p
                className={`mt-1 text-sm ${
                  "isOutlet" in cat && cat.isOutlet
                    ? "text-white/70"
                    : "text-gray"
                }`}
              >
                {cat.description}
              </p>
            </Link>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

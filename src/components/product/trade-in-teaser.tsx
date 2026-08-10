import Link from "next/link";

export type TradeInTeaserProps = {
  /** Raw product category (e.g. "iphone", "ipad", "laptop", "smartwatch") — used
   *  only to pick a natural Danish word for the teaser question. Falls back to
   *  the generic "enhed" for anything unrecognised so the sentence is always
   *  grammatically safe ("en gammel enhed"). */
  category?: string;
};

const DEVICE_WORD: Record<string, string> = {
  iphone: "telefon",
  smartphone: "telefon",
  ipad: "tablet",
  laptop: "bærbar",
};

function deviceWord(category?: string): string {
  if (!category) return "enhed";
  return DEVICE_WORD[category] ?? "enhed";
}

/**
 * Static, link-only trade-in teaser for the PDP buy column.
 *
 * Deliberately shows no price, range or placeholder figure. The public
 * /api/trade-in/estimate-public endpoint that used to back a numeric version
 * of this component was removed: its published range was derived from a
 * sealed brand-new listing (no grade filter) via `floorOfferOre` — the MOST
 * generous offer we could honour, not a conservative one — and since it was
 * a fixed ratio of a public list price, our margin percentage was derivable
 * from a single request. The owner decided no trade-in number is published
 * anywhere on the site. This component is purely a call to action toward
 * the sell flow, where a real, individual price is calculated from the
 * customer's actual device and condition.
 */
export function TradeInTeaser({ category }: TradeInTeaserProps) {
  const word = deviceWord(category);

  return (
    <div className="border-l-2 border-[#1A3D2E]/25 py-0.5 pl-3">
      <p className="text-xs font-semibold text-[#111111]">Har du en gammel {word}?</p>
      <Link
        href="/saelg-din-enhed"
        className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-green-eco hover:underline"
      >
        Få en pris på 30 sekunder
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3 w-3"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </Link>
    </div>
  );
}

import Link from "next/link";

export function CartUpsell() {
  return (
    <div className="border-t border-sand px-5 py-4">
      <p className="font-display text-xs font-bold uppercase tracking-wider text-charcoal">
        Glem ikke
      </p>
      <Link
        href="/covers"
        className="mt-2 flex items-center gap-3 rounded-radius-md border border-soft-grey bg-cream/50 p-3 transition-colors hover:border-green-eco"
      >
        <span className="text-2xl">{"\u{1F6E1}\uFE0F"}</span>
        <div>
          <p className="text-sm font-medium text-charcoal">Beskyt din enhed</p>
          <p className="text-xs text-gray">{"Se covers og panserglas \u2192"}</p>
        </div>
      </Link>
    </div>
  );
}

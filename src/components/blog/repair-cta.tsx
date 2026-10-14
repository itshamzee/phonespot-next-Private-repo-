import Link from "next/link";

/**
 * CTA-blok til reparationsguides i blogindlæg (bruges som <RepairCta /> i MDX).
 * Ingen garantitekst her: vilkår for den enkelte reparation står på hub-siden.
 */
export function RepairCta({
  href = "/reparation/macbook",
  title = "Få din MacBook repareret i Vejle eller Slagelse – fast pris før vi går i gang",
  label = "Se MacBook-reparation og priser",
}: {
  href?: string;
  title?: string;
  label?: string;
}) {
  return (
    <aside className="not-prose my-8 rounded-xl border border-[#1A3D2E]/20 bg-[#1A3D2E]/5 p-6">
      <p className="font-display text-lg font-bold leading-snug text-charcoal">{title}</p>
      <p className="mt-2 font-body text-sm text-charcoal/70">
        Kom forbi uden tid i Vejle eller Slagelse, eller send maskinen ind med gratis fragtlabel.
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center rounded-full bg-[#1A3D2E] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {label}
      </Link>
    </aside>
  );
}

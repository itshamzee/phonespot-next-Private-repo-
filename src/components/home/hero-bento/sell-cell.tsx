import Link from 'next/link';

export function SellCell() {
  return (
    <Link
      href="/saelg-din-enhed"
      className="col-span-1 row-span-1 relative bg-green-pale text-charcoal rounded-2xl overflow-hidden p-6 flex flex-col justify-end hover:-translate-y-0.5 transition-transform"
    >
      <span className="absolute top-5 left-6 font-mono text-[10px] bg-green-eco text-white px-2.5 py-1 rounded uppercase tracking-[0.5px]">
        betalt på 24 t
      </span>
      <div className="absolute right-[-5%] top-[25%] w-1/2 h-1/2 bg-[radial-gradient(circle_at_center,rgba(45,107,69,0.35)_0%,transparent_70%)] rounded-full" />
      <h3 className="font-display font-extrabold text-[28px] leading-[0.92] tracking-[-0.5px] lowercase relative z-10">
        sælg <em className="italic text-green-eco">din</em><br />gamle.
      </h3>
      <p className="text-xs text-charcoal-light mt-1.5 relative z-10">Gratis afhentning. Ingen ventetid.</p>
    </Link>
  );
}

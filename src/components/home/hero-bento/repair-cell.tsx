import Link from 'next/link';

export function RepairCell() {
  return (
    <Link
      href="/reparation"
      className="col-span-1 row-span-1 relative bg-rust text-white rounded-2xl overflow-hidden p-6 flex flex-col justify-end hover:-translate-y-0.5 transition-transform"
    >
      <span className="absolute top-5 left-6 font-mono text-[10px] border border-white/40 px-2 py-1 uppercase tracking-[0.5px] -rotate-1">
        vejle · slagelse
      </span>
      <span className="absolute top-5 right-6 text-[22px]">↗</span>
      <h3 className="font-display font-extrabold italic text-[28px] leading-[0.95] lowercase">
        reparation<br />mens du venter.
      </h3>
      <p className="font-mono text-[10.5px] text-white/85 tracking-[0.3px] mt-1">samme dag · fra 599 kr</p>
    </Link>
  );
}

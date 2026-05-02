import Link from 'next/link';

export function ComputerCell() {
  return (
    <Link
      href="/baerbare"
      className="col-span-2 row-span-1 max-md:col-span-1 relative bg-cream rounded-2xl overflow-hidden p-6 flex flex-col justify-end hover:-translate-y-0.5 transition-transform"
    >
      <div className="absolute right-[-8%] top-[16%] w-[70%] h-[56%] bg-gradient-to-b from-white to-sand rounded-t-[4px] rounded-b-[14px] shadow-[0_18px_32px_rgba(0,0,0,0.14)] -rotate-[7deg] opacity-85 before:content-[''] before:absolute before:inset-[6px_6px_30%_6px] before:bg-charcoal before:rounded-[2px]" />
      <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-charcoal-light mb-1.5 relative z-10">
        macbook · thinkpad · lenovo
      </span>
      <h3 className="font-display font-extrabold text-[36px] leading-[0.92] tracking-[-0.5px] lowercase relative z-10 max-lg:text-[28px]">
        <em className="italic text-green-eco">køb</em><br />computer.
      </h3>
      <p className="text-xs text-charcoal-light relative z-10 mt-1">Fra 2.999 kr. 36 mdrs. garanti.</p>
    </Link>
  );
}

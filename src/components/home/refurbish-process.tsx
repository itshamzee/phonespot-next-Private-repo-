const STEPS = [
  {
    n: '01',
    title: 'indsamlet hos kunder.',
    body: 'Telefoner og computere købes direkte hos kunder eller via vores buyback-program. Hver enhed registreres og spores.',
    photoTone: 'from-cream to-sand',
  },
  {
    n: '02',
    title: '30+ tekniske tests.',
    body: 'Batteri, skærm, kamera, højttaler, ladning, biometri, vandtæthed. Hver enhed får en grade-rapport (A/B/C) der følger med.',
    photoTone: 'from-sand to-soft-grey',
  },
  {
    n: '03',
    title: 'garanteret klar.',
    body: 'Renset, klargjort, pakket. 36 måneders garanti og 30 dages retur. Klar til at sendes eller hentes i Vejle / Slagelse.',
    photoTone: 'from-green-pale to-cream',
  },
];

export function RefurbishProcess() {
  return (
    <section className="bg-warm-white py-14 px-9 max-md:py-10 max-md:px-5">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex justify-between items-end pb-3.5 mb-9 border-b border-charcoal max-md:flex-col max-md:items-start max-md:gap-3 max-md:mb-6">
          <h2 className="font-display font-black text-[56px] leading-[0.9] tracking-[-1.5px] lowercase max-md:text-[40px]">
            sådan <em className="italic text-green-eco">refurber</em> vi.
          </h2>
          <span className="font-mono text-[11px] text-gray uppercase tracking-[0.5px]">
            30+ tests · 3 trin · 100% transparens
          </span>
        </div>

        <div className="relative grid grid-cols-3 gap-6 max-md:grid-cols-1 max-md:gap-8">
          {/* connecting line behind the numbers */}
          <div className="absolute top-7 left-[calc(16.66%+30px)] right-[calc(16.66%+30px)] h-px bg-gradient-to-r from-green-eco via-charcoal to-green-eco opacity-50 pointer-events-none max-md:hidden" />

          {STEPS.map(step => (
            <div key={step.n} className="relative z-10">
              <span className="font-display font-black italic text-[56px] text-green-eco tracking-[-1.5px] leading-[0.85] mb-3.5 inline-block bg-warm-white pr-3.5">
                {step.n}
              </span>
              <div className={`h-40 rounded-xl mb-4 bg-gradient-to-b ${step.photoTone} border border-sand`} />
              <h3 className="font-display font-extrabold text-[28px] leading-[0.95] tracking-[-0.5px] lowercase mb-2">
                {step.title}
              </h3>
              <p className="text-[13px] text-charcoal-light leading-[1.5]">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

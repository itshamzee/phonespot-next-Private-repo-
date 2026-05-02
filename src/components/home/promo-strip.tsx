import { getStoreStatus } from '@/lib/data/store-status';

export async function PromoStrip() {
  const [vejle, slagelse] = await Promise.all([
    getStoreStatus('vejle'),
    getStoreStatus('slagelse'),
  ]);

  const vejleLabel = vejle.isOpen
    ? `Vejle ${vejle.hoursToday} åbent`
    : 'Vejle lukket';
  const slagelseLabel = slagelse.isOpen
    ? `Slagelse ${slagelse.hoursToday} åbent`
    : 'Slagelse lukket';

  return (
    <div className="bg-charcoal text-warm-white font-mono text-[10.5px] tracking-[0.4px] py-2 px-7 flex justify-between items-center gap-4">
      <span className="before:content-['●_'] before:text-green-light">{vejleLabel}</span>
      <span className="before:content-['●_'] before:text-green-light">{slagelseLabel}</span>
      <span className="text-green-light whitespace-nowrap">★ Trustpilot 4.7 · 36 mdr garanti</span>
    </div>
  );
}

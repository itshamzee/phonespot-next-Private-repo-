import Link from 'next/link';
import { getStoreStatus, type ComposedStoreStatus } from '@/lib/data/store-status';

export async function StoresBand() {
  const [vejle, slagelse] = await Promise.all([
    getStoreStatus('vejle'),
    getStoreStatus('slagelse'),
  ]);

  const headerLabel = vejle.isOpen || slagelse.isOpen ? 'åben nu' : 'lukket nu';

  return (
    <section className="bg-charcoal text-warm-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex justify-between items-center px-9 py-4 border-b border-white/10 max-md:flex-col max-md:gap-2 max-md:px-5 max-md:py-3">
          <span className="font-mono text-[11px] text-green-light uppercase tracking-[0.6px] before:content-['●_']">{headerLabel}</span>
          <h2 className="font-display font-black italic text-[36px] tracking-[-0.5px] lowercase max-md:text-[28px]">besøg os fysisk.</h2>
          <span className="font-mono text-[11px] text-white/50 uppercase tracking-[0.6px]">walk-in · ingen tid bestilt</span>
        </div>
        <div className="grid grid-cols-2 max-md:grid-cols-1">
          <StoreCell store={vejle} />
          <StoreCell store={slagelse} />
        </div>
      </div>
    </section>
  );
}

function StoreCell({ store }: { store: ComposedStoreStatus }) {
  const wait = !store.isOpen
    ? 'lukket'
    : store.isStale || store.waitMinutes === null
      ? 'ring for ventetid'
      : `~ ${store.waitMinutes} min`;

  const tech = !store.isOpen
    ? 'værksted lukket'
    : store.isStale || store.technicianCount === null
      ? 'ring for status'
      : `${store.technicianCount} ${store.technicianCount === 1 ? 'tekniker' : 'teknikere'}`;

  // Italicize the last 2 characters of the city name (vej-LE, slagel-SE)
  const cityLower = store.city.toLowerCase();
  const cityHead = cityLower.slice(0, -2);
  const cityTail = cityLower.slice(-2);

  return (
    <Link
      href={`/butik/${store.slug}`}
      className="relative px-9 py-9 border-r border-white/10 last:border-r-0 max-md:border-r-0 max-md:border-b max-md:last:border-b-0 max-md:px-5 max-md:py-7 hover:bg-white/[0.04] transition-colors"
    >
      <h3 className="font-display font-black text-[64px] leading-[0.9] tracking-[-1.5px] lowercase mb-1 max-md:text-[48px]">
        {cityHead}<em className="italic text-green-light">{cityTail}</em>.
      </h3>
      <p className="text-[13px] text-white/60 mb-5">{store.fullAddress}</p>

      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-dashed border-white/[0.18]">
        <div>
          <div className="font-mono text-[9.5px] text-green-light uppercase tracking-[0.5px] mb-1">Åbent i dag</div>
          <div className="font-display font-bold text-[22px]">
            {store.hoursToday ?? 'Lukket'}
          </div>
        </div>
        <div>
          <div className="font-mono text-[9.5px] text-green-light uppercase tracking-[0.5px] mb-1">Ventetid</div>
          <div className="font-display font-bold text-[22px]">{wait}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-mono text-[9.5px] text-green-light uppercase tracking-[0.5px] mb-1">Reparation</div>
          <div className="text-sm leading-tight font-medium">samme dag<br />fra 599 kr</div>
        </div>
        <div>
          <div className="font-mono text-[9.5px] text-green-light uppercase tracking-[0.5px] mb-1">Værksted</div>
          <div className="text-sm leading-tight font-medium">{tech}</div>
        </div>
      </div>

      <span className="absolute bottom-9 right-9 font-display font-bold italic text-[22px] text-green-light max-md:bottom-5 max-md:right-5">se kort →</span>
    </Link>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { getFeaturedProduct } from '@/lib/data/featured-product';

function weekNumber(d: Date = new Date()): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

export async function FeaturedCell() {
  const product = await getFeaturedProduct();

  return (
    <Link
      href={product ? `/${product.template.slug}` : '/iphones'}
      className="col-span-4 row-span-2 max-md:col-span-1 max-md:row-span-1 bg-charcoal rounded-[22px] overflow-hidden grid grid-cols-[1.05fr_1fr] max-md:grid-cols-1 hover:opacity-95 transition-opacity"
    >
      {/* LEFT — brand statement */}
      <div className="px-8 py-9 flex flex-col justify-between text-warm-white">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.6px] text-white/55">
            est. 2014 · <strong className="text-green-light font-semibold">dansk værksted</strong>
          </span>
          <h1 className="font-display font-black text-[64px] leading-[0.88] tracking-[-1.5px] my-5 lowercase max-lg:text-[48px]">
            renoveret.<br />fra dansk<br /><em className="italic text-green-light">værksted.</em>
          </h1>
          <p className="text-[13.5px] leading-[1.55] text-white/[0.78] max-w-[95%]">
            Telefoner og computere testet i 30+ punkter. Renset, klargjort og dækket af 36 måneders garanti. Op til 40 % billigere end nyt.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[9.5px] uppercase tracking-[0.5px] text-white/65 pt-4 border-t border-white/10">
          <span className="before:content-['✓_'] before:text-green-light before:font-bold">30+ tests</span>
          <span className="before:content-['✓_'] before:text-green-light before:font-bold">36 mdr garanti</span>
          <span className="before:content-['✓_'] before:text-green-light before:font-bold">30 dages retur</span>
        </div>
      </div>

      {/* RIGHT — featured product */}
      <div className="bg-gradient-to-br from-charcoal-light to-black border-l border-white/10 max-md:border-l-0 max-md:border-t flex flex-col justify-between p-7">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] bg-green-light/20 border border-green-light/40 text-green-light px-2.5 py-1 rounded-full uppercase tracking-[0.6px]">
            topvalg
          </span>
          <span className="font-mono text-[10px] text-white/50">uge {weekNumber()}</span>
        </div>

        <div className="flex-1 flex items-center justify-center my-4 min-h-[140px]">
          {product?.template.image ? (
            <Image
              src={product.template.image}
              alt={product.template.displayName}
              width={240}
              height={240}
              className="object-contain max-h-[200px] w-auto"
            />
          ) : (
            <div className="w-[120px] h-[180px] bg-gradient-to-br from-charcoal-light to-black rounded-[28px] border border-white/10" />
          )}
        </div>

        <div className="text-white">
          <div className="font-display font-extrabold italic text-[26px] lowercase leading-none mb-1">
            {(product?.template.displayName ?? 'iPhone 15 Pro Max').toLowerCase()}
          </div>
          <div className="font-mono text-[10.5px] text-white/55 mb-3">
            {[product?.template.color, product?.topGrade && `karakter ${product.topGrade}`, product?.template.storage]
              .filter(Boolean).join(' · ') || 'titanium · karakter A · 256 GB'}
          </div>
          <div className="flex items-baseline gap-3 mb-1.5">
            <span className="font-display font-black italic text-[30px] text-green-light">
              fra {product?.fromPrice?.toLocaleString('da-DK') ?? '—'} kr
            </span>
            {product?.originalPrice ? (
              <span className="text-xs text-white/45 line-through">nyt {product.originalPrice.toLocaleString('da-DK')} kr</span>
            ) : null}
          </div>
          {product?.savings ? (
            <div className="font-mono text-[10px] text-green-light tracking-[0.5px]">
              spar op til {product.savings.toLocaleString('da-DK')} kr
            </div>
          ) : null}
          <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-dashed border-white/[0.18] font-mono text-[10px] text-white/65 tracking-[0.4px]">
            <span>● {product?.stockCount ?? 0} på lager · ekspres</span>
            <span className="text-green-light text-base font-sans not-italic">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

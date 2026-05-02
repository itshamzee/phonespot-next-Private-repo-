import Link from 'next/link';

type CategoryColor = 'dark' | 'cream' | 'mint' | 'rust';

type Category = {
  slug: string;
  label: string;
  emphasis: string | null;     // syllable to italicize, must be a substring of label
  priceFrom: string | null;
  meta: string | null;
  size: 'tall' | 'small';
  color: CategoryColor;
};

const CATEGORIES: Category[] = [
  { slug: 'iphones',     label: 'iphones',     emphasis: 'phones', priceFrom: '1.499', meta: '240+ modeller',          size: 'tall',  color: 'dark'  },
  { slug: 'mac',         label: 'macbooks',    emphasis: 'mac',    priceFrom: '4.499', meta: null,                      size: 'small', color: 'cream' },
  { slug: 'ipads',       label: 'ipads',       emphasis: null,     priceFrom: '1.999', meta: null,                      size: 'small', color: 'dark'  },
  { slug: 'baerbare',    label: 'bærbare',     emphasis: 'bare',   priceFrom: null,    meta: 'windows · thinkpad',     size: 'small', color: 'mint'  },
  { slug: 'apple-watch', label: 'apple watch', emphasis: null,     priceFrom: '999',   meta: null,                      size: 'small', color: 'rust'  },
  { slug: 'tilbehoer',   label: 'tilbehør',    emphasis: 'behør',  priceFrom: null,    meta: 'covers · ladere',        size: 'small', color: 'cream' },
];

const COLOR_CLASSES: Record<CategoryColor, string> = {
  dark:  'bg-gradient-to-b from-black to-charcoal text-white',
  cream: 'bg-cream text-charcoal',
  mint:  'bg-green-pale text-charcoal',
  rust:  'bg-rust text-white',
};

function renderLabel(label: string, emphasis: string | null) {
  if (!emphasis) return label;
  const idx = label.indexOf(emphasis);
  if (idx < 0) return label;
  return (
    <>
      {label.slice(0, idx)}
      <em className="italic text-green-eco">{emphasis}</em>
      {label.slice(idx + emphasis.length)}
    </>
  );
}

export function CategoriesBento() {
  return (
    <section className="bg-warm-white py-14 px-9 max-md:py-10 max-md:px-5">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex justify-between items-end pb-3.5 mb-7 border-b border-charcoal max-md:flex-col max-md:items-start max-md:gap-3">
          <h2 className="font-display font-black text-[56px] leading-[0.9] tracking-[-1.5px] lowercase max-md:text-[40px]">
            se det <em className="italic text-green-eco">hele</em>.
          </h2>
          <span className="font-mono text-[11px] text-gray uppercase tracking-[0.5px] text-right max-md:text-left">
            6 kategorier · 1.200+ produkter
          </span>
        </div>

        <div className="grid grid-cols-3 grid-rows-[200px_200px] gap-3.5 max-md:grid-cols-2 max-md:grid-rows-none max-md:auto-rows-[160px]">
          {CATEGORIES.map((cat, i) => {
            const span = cat.size === 'tall' ? 'row-span-2 max-md:row-span-1' : 'row-span-1';
            const isDark = cat.color === 'dark' || cat.color === 'rust';
            return (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className={`relative rounded-2xl overflow-hidden p-6 flex flex-col justify-between hover:-translate-y-0.5 transition-transform ${COLOR_CLASSES[cat.color]} ${span}`}
              >
                <span className={`font-mono text-[10px] uppercase tracking-[0.5px] ${isDark ? 'text-white/55' : 'text-charcoal-light/70'}`}>
                  {`0${i + 1} / KATEGORI`}
                </span>
                <div>
                  <h3 className={`font-display font-extrabold lowercase tracking-[-0.5px] leading-[0.95] ${cat.size === 'tall' ? 'text-[64px] max-lg:text-[48px]' : 'text-[28px]'}`}>
                    {renderLabel(cat.label, cat.emphasis)}.
                  </h3>
                  {(cat.priceFrom || cat.meta) && (
                    <span className={`font-mono text-[10px] tracking-[0.4px] mt-1 block ${cat.color === 'dark' ? 'text-green-light' : cat.color === 'rust' ? 'text-white/80' : 'text-charcoal-light'}`}>
                      {cat.priceFrom && `fra ${cat.priceFrom} kr`}
                      {cat.priceFrom && cat.meta && ' · '}
                      {cat.meta}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

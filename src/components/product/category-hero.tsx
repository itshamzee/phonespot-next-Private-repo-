type CategoryHeroProps = {
  title: string;
  description?: string;
  productCount?: number;
  backgroundImage?: string;
};

export function CategoryHero({
  title,
  description,
  productCount,
}: CategoryHeroProps) {
  return (
    <div className="overflow-hidden rounded-3xl bg-[#F7F7F8] border border-[#E5E5EA]">
      <div className="px-8 py-12 md:px-14 md:py-16">
        <div className="max-w-2xl">
          {/* Accent line */}
          <div className="mb-5 h-1 w-10 rounded-full bg-[#1A3D2E]" />

          {productCount !== undefined && productCount > 0 && (
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#1A3D2E]/20 bg-[#1A3D2E]/8 px-4 py-1.5 text-sm font-medium text-[#1A3D2E]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1A3D2E] animate-pulse" />
              {productCount} produkter på lager
            </span>
          )}

          <h1 className="font-display text-4xl font-bold tracking-tight text-[#111111] md:text-5xl lg:text-6xl">
            {title}
          </h1>

          {description && (
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#86868B] md:text-lg">
              {description}
            </p>
          )}

          {/* Trust badges row */}
          <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-[#86868B]">
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]">
                <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              36 mdr. garanti
            </span>
            <span className="text-[#E5E5EA]">|</span>
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              30+ tests
            </span>
            <span className="text-[#E5E5EA]">|</span>
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]">
                <path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z" />
              </svg>
              1-2 dages levering
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

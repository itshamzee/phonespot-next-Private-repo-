/**
 * Pladsholder mens noget indlæses: en stille blok i #EEF0EC. Den pulserer roligt
 * (1,4 s) kun når brugeren ikke har bedt om reduceret bevægelse (app/admin-motion.css).
 * Mål og hjørner gives med className.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`m-skeleton bg-[#EEF0EC] ${className}`} />;
}

const surface = "rounded-xl border border-[#E2E5E0] bg-white p-5";

/**
 * Neutralt sideskelet til admin: overskrift og tre flader i husets stil (1 px kant,
 * 12 px hjørner, ingen skygge). Bruges af app/(admin)/admin/loading.tsx og af rammen,
 * mens butiksvalget hentes.
 */
export function PageSkeleton() {
  return (
    <div data-skeleton aria-busy="true" aria-label="Indlæser" className="flex flex-col gap-5">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div data-skeleton-surface className={surface}>
        <Skeleton className="h-4 w-40 rounded-md" />
        <Skeleton className="mt-4 h-10 w-56 rounded-md" />
        <Skeleton className="mt-4 h-4 w-2/3 rounded-md" />
      </div>
      <div data-skeleton-surface className={surface}>
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="mt-4 h-[180px] w-full rounded-md" />
      </div>
      <div data-skeleton-surface className={surface}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`flex items-center justify-between gap-4 py-3 ${i ? "border-t border-[#EEF0EC]" : ""}`}>
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

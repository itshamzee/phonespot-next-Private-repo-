import { Skeleton } from "@/components/admin/ui/skeleton";

const surface = "rounded-xl border border-[#E2E5E0] bg-white px-5 py-[18px]";

/**
 * Overblik, mens tallene hentes: overskrift med periodevælger, panelet med
 * reparationsanmodninger, fire nøgletal og to paneler, i sidens egne mål.
 * data-skeleton: rammens .m-page lader det stå stille, og den rigtige side glider ind.
 */
export function OverviewSkeleton() {
  return (
    <div data-skeleton aria-busy="true" aria-label="Indlæser" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-9 w-48 rounded-lg sm:h-10" />
        <Skeleton className="h-[42px] w-60 rounded-[10px]" />
      </div>
      <div data-skeleton-surface className={surface}>
        <Skeleton className="h-5 w-64 rounded-md" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="mt-3 flex items-center justify-between gap-4 border-t border-[#EEF0EC] pt-3">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} data-skeleton-surface className={surface}>
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="mt-2.5 h-8 w-32 rounded-md" />
            <Skeleton className="mt-2 h-3.5 w-24 rounded-md" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-4">
        {[0, 1].map((i) => (
          <div key={i} data-skeleton-surface className={surface}>
            <Skeleton className="h-5 w-40 rounded-md" />
            {[0, 1, 2].map((j) => (
              <div key={j} className="mt-3 flex items-center justify-between gap-4 border-t border-[#EEF0EC] pt-3">
                <Skeleton className="h-4 w-2/3 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/admin/ui/skeleton";

/**
 * Kassen, mens skærmen indlæses: topbjælke, scanfelt, kategorier og felter til venstre,
 * kurven med betalingsknapper til højre, i kassens egne mål (som kasse-screen.tsx),
 * så skærmen aldrig står tom. data-skeleton: rammens .m-page lader det stå stille.
 */
export function KasseSkeleton() {
  return (
    <div
      data-skeleton
      aria-busy="true"
      aria-label="Indlæser kassen"
      className="-m-4 flex min-h-[calc(100dvh-3.5rem)] flex-col bg-[#F5F6F4] sm:-m-5 lg:-m-8 lg:h-[calc(100dvh-3.5rem)]"
    >
      <div className="flex min-h-14 items-center gap-5 border-b border-[#E2E5E0] bg-white px-5 py-2">
        <Skeleton className="h-9 w-44 rounded-lg" />
        <Skeleton className="hidden h-4 w-56 rounded-md sm:block" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-4 w-20 rounded-md" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div data-kasse-skeleton="tiles" className="flex min-w-0 flex-1 flex-col gap-4 p-5">
          <Skeleton className="h-12 w-full rounded-[10px]" />
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[38px] w-24 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex h-[108px] flex-col justify-between rounded-xl border border-[#E2E5E0] bg-white p-3.5">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3.5 w-1/3 rounded-md" />
              </div>
            ))}
          </div>
        </div>
        <div
          data-kasse-skeleton="cart"
          className="flex min-h-[320px] flex-col border-t border-[#E2E5E0] bg-white lg:w-[400px] lg:shrink-0 lg:border-l lg:border-t-0"
        >
          <div className="flex items-center justify-between border-b border-[#E2E5E0] px-5 py-4">
            <Skeleton className="h-5 w-12 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
          <div className="flex-1" />
          <div className="flex flex-col gap-2.5 border-t border-[#E2E5E0] px-5 py-4">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-11 rounded-[10px]" />
              ))}
            </div>
            <Skeleton className="h-[60px] rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

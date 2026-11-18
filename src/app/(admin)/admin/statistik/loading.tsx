import { surfaceClass as card } from "@/components/admin/statistik/styles";

/**
 * Første indlæsning af Statistik: sidens ramme med tomme flader. Ved skift af
 * periode eller butik vises den ikke; dér bliver det gamle indhold stående dæmpet.
 */

function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-[#EEF0EC] ${className}`} />;
}


export default function StatistikLoading() {
  return (
    <div aria-busy="true" aria-label="Indlæser statistik" className="mx-auto flex max-w-[1320px] flex-col gap-5 min-[980px]:gap-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em] text-[#15211B] sm:text-[32px]">Statistik</h1>
        <Bar className="h-11 w-64" />
      </div>

      <div className="grid grid-cols-1 gap-6 min-[980px]:grid-cols-[1.25fr_1fr]">
        <div className={card}>
          <Bar className="h-4 w-48" />
          <Bar className="mt-4 h-12 w-56" />
          <Bar className="mt-4 h-4 w-40" />
          <Bar className="mt-[26px] h-[72px] w-full" />
        </div>
        <div className={card}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`flex justify-between gap-4 ${i ? "border-t border-[#EEF0EC] pt-5" : ""} pb-5`}>
              <Bar className="h-10 w-32" />
              <Bar className="h-8 w-28" />
            </div>
          ))}
        </div>
      </div>

      <Bar className="h-11 w-full max-w-[560px]" />

      <div className="grid grid-cols-1 gap-6 min-[980px]:grid-cols-[2fr_1fr]">
        <div className={card}>
          <Bar className="h-5 w-40" />
          <Bar className="mt-3 h-10 w-48" />
          <Bar className="mt-[22px] h-[260px] w-full" />
        </div>
        <div className={card}>
          <Bar className="h-5 w-36" />
          <Bar className="mt-4 h-32 w-full" />
          <Bar className="mt-8 h-5 w-32" />
          <Bar className="mt-4 h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

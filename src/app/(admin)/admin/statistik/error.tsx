"use client";

import { useEffect } from "react";
import { surfaceClass } from "@/components/admin/statistik/styles";

/**
 * Fejl under indlæsningen af Statistik (fx en forespørgsel, der kaster): sidens
 * ramme med en kort besked og "Prøv igen", som genindlæser segmentet.
 */
export default function StatistikError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Statistik kunne ikke hentes", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-5 min-[980px]:gap-7">
      <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em] text-[#15211B] sm:text-[32px]">Statistik</h1>
      <section role="alert" className={surfaceClass}>
        <h2 className="m-0 text-[18px] font-bold text-[#15211B]">Statistikken kunne ikke hentes</h2>
        <p className="mb-0 mt-2 text-[15px] text-[#5E6A63]">Tallene kunne ikke indlæses lige nu. Prøv igen om et øjeblik.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 h-11 cursor-pointer rounded-lg border-0 bg-[#1A3D2E] px-4 text-[14px] font-semibold text-white motion-safe:active:scale-[0.98]"
        >
          Prøv igen
        </button>
      </section>
    </div>
  );
}

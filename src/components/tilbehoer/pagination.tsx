"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { PAGE_SIZE } from "@/lib/tilbehoer-filters";

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalCount, totalPages }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const showing = Math.min(currentPage * PAGE_SIZE, totalCount);

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());

      if (page <= 1) {
        params.delete("side");
      } else {
        params.set("side", String(page));
      }

      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      <p className="text-sm text-gray">
        Viser {showing} af {totalCount} produkter
      </p>

      {currentPage < totalPages && (
        <button
          onClick={() => goToPage(currentPage + 1)}
          className="rounded-xl border border-sand bg-white px-8 py-3 text-sm font-bold text-charcoal transition-colors hover:border-green-eco hover:text-green-eco"
        >
          Vis flere
        </button>
      )}

      {totalPages > 1 && (
        <div className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                page === currentPage
                  ? "bg-charcoal text-white"
                  : "text-gray hover:bg-cream hover:text-charcoal"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

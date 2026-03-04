"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import type { ProductVariant } from "@/lib/medusa/types";

type Grade = "A" | "B" | "C";

type GradeInfo = {
  grade: Grade;
  label: string;
  sublabel: string;
  variant: ProductVariant | null;
  image: string;
};

const GRADE_META: Record<Grade, { label: string; sublabel: string }> = {
  A: { label: "Som ny", sublabel: "Ingen synlige brugsspor" },
  B: { label: "God stand", sublabel: "Lette brugsspor" },
  C: { label: "Okay stand", sublabel: "Synlige brugsspor" },
};

const GRADE_BORDER: Record<Grade, { selected: string; idle: string }> = {
  A: { selected: "border-green-eco ring-2 ring-green-eco/20", idle: "border-soft-grey" },
  B: { selected: "border-green-light ring-2 ring-green-light/20", idle: "border-soft-grey" },
  C: { selected: "border-gray ring-2 ring-gray/20", idle: "border-soft-grey" },
};

function getSavings(current: string, highest: string): number | null {
  const c = parseFloat(current);
  const h = parseFloat(highest);
  if (h <= c || h === 0) return null;
  return Math.round(((h - c) / h) * 100);
}

type GradePickerProps = {
  variants: ProductVariant[];
  selectedGrade: Grade;
  gradeImages: Record<Grade, string>;
};

export function GradePicker({
  variants,
  selectedGrade,
  gradeImages,
}: GradePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const grades: GradeInfo[] = (["A", "B", "C"] as Grade[]).map((grade) => {
    const gradeLabel = GRADE_META[grade].label.toLowerCase();
    const variant = variants.find((v) =>
      v.selectedOptions.some(
        (opt) =>
          opt.name.toLowerCase() === "stand" &&
          opt.value.toLowerCase() === gradeLabel,
      ),
    ) ?? null;

    return {
      grade,
      label: GRADE_META[grade].label,
      sublabel: GRADE_META[grade].sublabel,
      variant,
      image: gradeImages[grade],
    };
  });

  const gradeAPrice = grades[0]?.variant?.price?.amount ?? "0";

  const handleSelect = useCallback(
    (grade: GradeInfo) => {
      if (!grade.variant) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("stand", grade.label);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-charcoal">
        Vælg stand
      </p>
      <div className="grid grid-cols-3 gap-3">
        {grades.map((g) => {
          const isSelected = g.grade === selectedGrade;
          const isUnavailable = !g.variant || !g.variant.availableForSale;
          const price = g.variant?.price;
          const savings = price ? getSavings(price.amount, gradeAPrice) : null;

          return (
            <button
              key={g.grade}
              type="button"
              disabled={isUnavailable}
              onClick={() => handleSelect(g)}
              className={`group relative overflow-hidden rounded-2xl border-2 bg-white text-left transition-all ${
                isSelected
                  ? GRADE_BORDER[g.grade].selected
                  : GRADE_BORDER[g.grade].idle
              } ${
                isUnavailable
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
              }`}
            >
              {/* Grade image */}
              <div className="relative aspect-square overflow-hidden bg-sand/30">
                <Image
                  src={g.image}
                  alt={`${g.label} stand`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 200px"
                />
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="font-display text-sm font-bold text-charcoal">
                  {g.label}
                </p>
                <p className="text-[11px] text-gray">{g.sublabel}</p>

                {price && !isUnavailable ? (
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-base font-bold text-charcoal">
                      {parseFloat(price.amount).toLocaleString("da-DK")} kr
                    </span>
                    {savings && (
                      <span className="rounded-full bg-green-eco/10 px-2 py-0.5 text-[10px] font-semibold text-green-eco">
                        Spar {savings}%
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-medium text-gray">Udsolgt</p>
                )}
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-eco">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="h-3 w-3">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

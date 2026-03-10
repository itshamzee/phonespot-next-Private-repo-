"use client";

import type { ProductVariant } from "@/lib/shopify/types";

type Grade = "Ny" | "A" | "B" | "C";

const GRADE_META: Record<
  Grade,
  { label: string; sublabel: string; ring: string; badgeBg: string; badgeColor: string }
> = {
  Ny: {
    label: "Ny",
    sublabel: "Fabriksny — uåbnet eller nyåbnet",
    ring: "border-blue-500 ring-blue-500/20",
    badgeBg: "bg-blue-50",
    badgeColor: "text-blue-600",
  },
  A: {
    label: "Som ny",
    sublabel: "Ingen synlige brugsspor",
    ring: "border-green-eco ring-green-eco/20",
    badgeBg: "bg-green-eco/10",
    badgeColor: "text-green-eco",
  },
  B: {
    label: "God stand",
    sublabel: "Lette brugsspor på kanten",
    ring: "border-amber-500 ring-amber-500/20",
    badgeBg: "bg-amber-50",
    badgeColor: "text-amber-600",
  },
  C: {
    label: "Okay stand",
    sublabel: "Synlige brugsspor. Bedste pris",
    ring: "border-gray ring-gray/20",
    badgeBg: "bg-gray/10",
    badgeColor: "text-gray",
  },
};

/** Map any Stand value from Shopify to a normalized grade. */
function normalizeGrade(value: string): Grade | null {
  const v = value.toLowerCase().trim();
  if (v === "ny" || v === "ny stand" || v === "new" || v === "fabriksny") return "Ny";
  if (v === "som ny" || v === "som new") return "A";
  if (v === "god" || v === "god stand") return "B";
  if (v === "okay" || v === "ok" || v === "okay stand" || v === "ok stand") return "C";
  if (v.includes("grade a") || (v.includes("ny") && v.includes("pakke"))) return "A";
  if (v.includes("grade c")) return "C";
  if (v.includes("grade b")) return "B";
  if (v.includes("som ny")) return "A";
  if (v.includes("god")) return "B";
  if (v.includes("okay") || v.includes("ok ")) return "C";
  return null;
}

function getSavings(current: string, highest: string): number | null {
  const c = parseFloat(current);
  const h = parseFloat(highest);
  if (h <= c || h === 0) return null;
  return Math.round(((h - c) / h) * 100);
}

type GradePickerProps = {
  variants: ProductVariant[];
  selectedGrade: Grade;
  onSelect?: (grade: Grade, standValue: string) => void;
};

export function GradePicker({
  variants,
  selectedGrade,
  onSelect,
}: GradePickerProps) {
  // Detect which grades actually exist in variants
  const allGrades: Grade[] = ["Ny", "A", "B", "C"];
  const existingGrades = new Set<Grade>();
  for (const v of variants) {
    for (const opt of v.selectedOptions) {
      if (opt.name.toLowerCase() === "stand") {
        const g = normalizeGrade(opt.value);
        if (g) existingGrades.add(g);
      }
    }
  }

  // Only show grades that exist in the product variants
  const gradesToShow = allGrades.filter((g) => existingGrades.has(g));

  const grades = gradesToShow.map((grade) => {
    const variant =
      variants.find((v) =>
        v.selectedOptions.some(
          (opt) =>
            opt.name.toLowerCase() === "stand" &&
            normalizeGrade(opt.value) === grade,
        ),
      ) ?? null;

    // Store the actual Shopify value for setting URL params
    const standValue =
      variant?.selectedOptions.find((o) => o.name.toLowerCase() === "stand")?.value ??
      GRADE_META[grade].label;

    return { grade, variant, standValue };
  });

  const highestPrice = grades[0]?.variant?.price?.amount ?? "0";

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-charcoal">
        {gradesToShow.length === 1 && gradesToShow[0] === "Ny" ? "Stand" : "Vælg stand"}
      </p>

      {/* Grade options */}
      <div className="flex flex-col gap-2">
        {grades.map(({ grade, variant, standValue }) => {
          const meta = GRADE_META[grade];
          const isSelected = grade === selectedGrade;
          const isUnavailable = !variant || !variant.availableForSale;
          const price = variant?.price;
          const savings = price ? getSavings(price.amount, highestPrice) : null;

          return (
            <button
              key={grade}
              type="button"
              disabled={isUnavailable}
              onClick={() => onSelect?.(grade, standValue)}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                isSelected
                  ? `${meta.ring} ring-2 bg-white shadow-sm`
                  : "border-sand bg-white hover:border-charcoal/20 hover:shadow-sm"
              } ${isUnavailable ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
            >
              {/* Radio */}
              <div
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected ? "border-green-eco bg-green-eco" : "border-charcoal/25"
                }`}
              >
                {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>

              {/* Badge + label */}
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${meta.badgeBg} ${meta.badgeColor}`}>
                {grade}
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-display text-sm font-bold text-charcoal">
                  {meta.label}
                </span>
                {!isSelected && (
                  <span className="ml-2 text-xs text-charcoal/45">{meta.sublabel}</span>
                )}
              </div>

              {/* Price */}
              <div className="shrink-0 text-right">
                {price && !isUnavailable ? (
                  <div className="flex items-baseline gap-1.5">
                    {savings && (
                      <span className="text-[11px] font-semibold text-green-eco">
                        -{savings}%
                      </span>
                    )}
                    <span className="font-display text-sm font-bold text-charcoal">
                      {parseFloat(price.amount).toLocaleString("da-DK")} kr
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-medium text-gray">Udsolgt</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-center text-[11px] text-charcoal/45">
        Alle enheder er 100% funktionelle med 36 mdr. garanti.{" "}
        <a href="#hvad-betyder-standen" className="font-medium text-green-eco underline-offset-2 hover:underline">
          Hvad betyder standen?
        </a>
      </p>
    </div>
  );
}

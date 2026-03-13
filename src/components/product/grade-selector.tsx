"use client";

type GradeOption = {
  grade: string;
  price: number | null;
  available: number;
};

type GradeSelectorProps = {
  grades: GradeOption[];
  selected: string;
  onChange: (grade: string) => void;
};

const GRADE_META: Record<
  string,
  { label: string; description: string; tooltip: string; color: string; bg: string }
> = {
  A: {
    label: "Perfekt",
    description: "Ingen synlige brugsspor",
    tooltip:
      "Grade A: Enheden er i perfekt stand uden synlige ridser eller mærker. Fremstår som ny.",
    color: "text-green-eco",
    bg: "bg-green-eco/10",
  },
  B: {
    label: "God",
    description: "Lette brugsspor",
    tooltip:
      "Grade B: Enheden har lette brugsspor som små ridser. Fuldt funktionel og god stand.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  C: {
    label: "Brugt",
    description: "Synlige brugsspor",
    tooltip:
      "Grade C: Enheden har synlige brugsspor. Fuldt funktionel og bedste pris.",
    color: "text-gray",
    bg: "bg-gray/10",
  },
};

function formatPrice(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(oere / 100);
}

export function GradeSelector({ grades, selected, onChange }: GradeSelectorProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-charcoal">Vælg stand</p>
      <div className="flex flex-col gap-2">
        {grades.map(({ grade, price, available }) => {
          const meta = GRADE_META[grade] ?? {
            label: grade,
            description: "",
            tooltip: "",
            color: "text-charcoal",
            bg: "bg-cream",
          };
          const isSelected = selected === grade;
          const isUnavailable = available === 0;

          return (
            <button
              key={grade}
              type="button"
              title={meta.tooltip}
              disabled={isUnavailable}
              onClick={() => onChange(grade)}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                isSelected
                  ? "border-green-eco bg-white shadow-sm ring-2 ring-green-eco/20"
                  : "border-sand bg-white hover:border-charcoal/20 hover:shadow-sm"
              } ${isUnavailable ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
            >
              {/* Radio dot */}
              <div
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected ? "border-green-eco bg-green-eco" : "border-charcoal/25"
                }`}
              >
                {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>

              {/* Grade badge */}
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${meta.bg} ${meta.color}`}
              >
                {grade}
              </span>

              {/* Label */}
              <div className="min-w-0 flex-1">
                <span className="font-display text-sm font-bold text-charcoal">
                  {meta.label}
                </span>
                <span className="ml-2 text-xs text-charcoal/45">
                  {meta.description}
                </span>
              </div>

              {/* Price / stock */}
              <div className="shrink-0 text-right">
                {isUnavailable ? (
                  <span className="text-xs font-medium text-gray">Udsolgt</span>
                ) : price != null ? (
                  <span className="font-display text-sm font-bold text-charcoal">
                    {formatPrice(price)} kr.
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-charcoal/45">
        Alle enheder er 100% funktionelle med 36 mdr. garanti
      </p>
    </div>
  );
}

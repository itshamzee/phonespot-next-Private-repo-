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
  { label: string; description: string; tooltip: string; color: string; bg: string; badge?: string }
> = {
  N: {
    label: "Fabriksny",
    description: "Uåbnet originalemballage",
    tooltip:
      "Fabriksny: Enheden er helt ny og uåbnet i original emballage med fuld producent-garanti.",
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    badge: "NY",
  },
  P: {
    label: "Premium",
    description: "Næsten perfekt stand",
    tooltip:
      "Premium: Enheden er i næsten perfekt stand med minimale eller ingen brugsspor. Nyt batteri isat — 100% kapacitet.",
    color: "text-indigo-600",
    bg: "bg-indigo-500/10",
    badge: "P",
  },
  A: {
    label: "Perfekt",
    description: "Ingen synlige brugsspor",
    tooltip:
      "Grade A: Enheden er i perfekt stand uden synlige ridser eller mærker. Fremstår som ny. Nyt batteri isat — 100% kapacitet.",
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

function getMeta(grade: string) {
  return (
    GRADE_META[grade] ?? {
      label: grade,
      description: "",
      tooltip: "",
      color: "text-charcoal",
      bg: "bg-cream",
    }
  );
}

export function GradeSelector({ grades, selected, onChange }: GradeSelectorProps) {
  // Only advertise stand we actually have — a sold-out grade greyed out in
  // the list still tells the buyer "we have this", which we don't.
  const inStock = grades.filter(({ available }) => available > 0);

  if (inStock.length === 0) {
    return null;
  }

  if (inStock.length === 1) {
    const { grade, price } = inStock[0];
    const meta = getMeta(grade);

    return (
      <div>
        <dl>
          <div className="flex items-start justify-between gap-3 border-b border-[#E5E5EA] py-2">
            <dt className="shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-charcoal/45">
              Stand
            </dt>
            <dd className="flex-1 text-right text-sm font-semibold leading-snug text-charcoal">
              {meta.label}
              {price != null && (
                <span className="ml-2 font-display text-charcoal">{formatPrice(price)} kr.</span>
              )}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-[11px] text-charcoal/45">
          {meta.description}
          {meta.description ? ". " : ""}
          Alle enheder er 100% funktionelle med 36 mdr. garanti.{" "}
          <a
            href="#hvad-betyder-standen"
            className="font-medium text-green-eco underline-offset-2 hover:underline"
          >
            Hvad betyder standen?
          </a>
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-bold text-charcoal">Vælg stand</p>
      <div className="flex flex-col gap-2">
        {inStock.map(({ grade, price }) => {
          const meta = getMeta(grade);
          const isSelected = selected === grade;

          return (
            <button
              key={grade}
              type="button"
              title={meta.tooltip}
              onClick={() => onChange(grade)}
              className={`flex items-center gap-3 rounded-xl border-2 px-3 sm:px-4 py-3 text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-green-eco bg-white shadow-sm ring-2 ring-green-eco/20"
                  : "border-sand bg-white hover:border-charcoal/20 hover:shadow-sm"
              }`}
            >
              {/* Radio dot */}
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected ? "border-green-eco bg-green-eco" : "border-charcoal/25"
                }`}
              >
                {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>

              {/* Grade badge */}
              <span
                className={`flex h-6 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-bold ${meta.bg} ${meta.color}`}
              >
                {meta.badge ?? grade}
              </span>

              {/* Label */}
              <div className="min-w-0 flex-1">
                <span className="font-display text-sm font-bold text-charcoal">
                  {meta.label}
                </span>
                <span className="ml-2 hidden sm:inline text-xs text-charcoal/45">
                  {meta.description}
                </span>
              </div>

              {/* Price */}
              {price != null && (
                <div className="shrink-0 text-right">
                  <span className="font-display text-sm sm:text-base font-bold text-charcoal">
                    {formatPrice(price)} kr.
                  </span>
                </div>
              )}
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

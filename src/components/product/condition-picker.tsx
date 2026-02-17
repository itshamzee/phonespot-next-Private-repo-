"use client";

type Grade = "A" | "B" | "C";

type GradeOption = {
  grade: Grade;
  label: string;
  price: string;
  available: boolean;
};

type ConditionPickerProps = {
  grades: GradeOption[];
  selected: Grade;
  onSelect: (grade: Grade) => void;
};

const formatPrice = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  minimumFractionDigits: 0,
});

export function ConditionPicker({ grades, selected, onSelect }: ConditionPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {grades.map((g) => {
        const isSelected = g.grade === selected;
        const isUnavailable = !g.available;

        return (
          <button
            key={g.grade}
            type="button"
            disabled={isUnavailable}
            onClick={() => onSelect(g.grade)}
            className={`rounded-radius-lg border-2 p-4 text-center transition-colors ${
              isSelected
                ? "border-green-eco bg-green-pale"
                : "border-soft-grey bg-white hover:border-green-eco/40"
            } ${isUnavailable ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <p className="font-display text-sm font-bold uppercase tracking-wider text-charcoal">
              Grade {g.grade}
            </p>
            <p className="mt-1 text-sm font-medium text-charcoal">{g.label}</p>
            <p className="mt-2 text-base font-bold text-charcoal">
              {isUnavailable ? (
                <span className="text-gray">Udsolgt</span>
              ) : (
                formatPrice.format(Number(g.price))
              )}
            </p>
          </button>
        );
      })}
    </div>
  );
}

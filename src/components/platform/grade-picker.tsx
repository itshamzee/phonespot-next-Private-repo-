"use client";

export type Grade = "A" | "B" | "C";

interface GradeOption {
  grade: Grade;
  label: string;
  description: string;
  activeClasses: string;
  borderClasses: string;
  iconColor: string;
}

const GRADE_OPTIONS: GradeOption[] = [
  {
    grade: "A",
    label: "Karakter A",
    description: "Perfekt stand — ingen synlige ridser",
    activeClasses: "bg-green-eco border-green-eco text-white",
    borderClasses: "border-green-eco/40 hover:border-green-eco/70",
    iconColor: "text-green-eco",
  },
  {
    grade: "B",
    label: "Karakter B",
    description: "God stand — lette brugsspor",
    activeClasses: "bg-yellow-500 border-yellow-500 text-white",
    borderClasses: "border-yellow-400/40 hover:border-yellow-400/70",
    iconColor: "text-yellow-500",
  },
  {
    grade: "C",
    label: "Karakter C",
    description: "Brugt stand — synlige ridser/mærker",
    activeClasses: "bg-orange-500 border-orange-500 text-white",
    borderClasses: "border-orange-400/40 hover:border-orange-400/70",
    iconColor: "text-orange-500",
  },
];

interface GradePickerProps {
  value: Grade | null;
  onChange: (grade: Grade) => void;
}

export function GradePicker({ value, onChange }: GradePickerProps) {
  return (
    <div className="flex gap-3">
      {GRADE_OPTIONS.map((opt) => {
        const isSelected = value === opt.grade;
        return (
          <button
            key={opt.grade}
            type="button"
            onClick={() => onChange(opt.grade)}
            className={[
              "flex flex-1 flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 text-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              isSelected
                ? opt.activeClasses
                : `border bg-white ${opt.borderClasses} text-stone-700`,
            ].join(" ")}
          >
            <span
              className={[
                "font-display text-3xl font-bold leading-none tracking-tight",
                isSelected ? "text-white" : opt.iconColor,
              ].join(" ")}
            >
              {opt.grade}
            </span>
            <span
              className={[
                "text-[11px] font-semibold uppercase tracking-wide",
                isSelected ? "text-white/90" : "text-stone-500",
              ].join(" ")}
            >
              {opt.label}
            </span>
            <span
              className={[
                "text-xs leading-tight",
                isSelected ? "text-white/80" : "text-stone-400",
              ].join(" ")}
            >
              {opt.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

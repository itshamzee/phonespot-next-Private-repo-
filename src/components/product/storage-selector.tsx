"use client";

type StorageSelectorProps = {
  options: string[];
  selected: string;
  onChange: (storage: string) => void;
};

export function StorageSelector({ options, selected, onChange }: StorageSelectorProps) {
  if (options.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-bold text-charcoal">
        Lagerplads{" "}
        <span className="font-normal text-charcoal/50">— {selected}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = opt === selected;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                isSelected
                  ? "border-green-eco bg-green-eco text-white"
                  : "border-sand bg-white text-charcoal hover:border-green-eco/50"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

type StorageSelectorProps = {
  options: string[];
  selected: string;
  onChange: (storage: string) => void;
  /** Storage values that currently have at least one device in stock. */
  availableOptions?: Set<string>;
};

export function StorageSelector({
  options,
  selected,
  onChange,
  availableOptions,
}: StorageSelectorProps) {
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
          const isAvailable = availableOptions ? availableOptions.has(opt) : true;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => isAvailable && onChange(opt)}
              disabled={!isAvailable}
              aria-disabled={!isAvailable}
              title={isAvailable ? opt : `${opt} — udsolgt`}
              className={`relative rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                isSelected
                  ? "border-green-eco bg-green-eco text-white"
                  : isAvailable
                    ? "border-sand bg-white text-charcoal hover:border-green-eco/50"
                    : "cursor-not-allowed border-sand bg-white text-charcoal/30 line-through"
              }`}
            >
              {opt}
              {!isAvailable && (
                <span className="ml-1 text-[10px] font-normal uppercase tracking-wide no-underline">
                  udsolgt
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

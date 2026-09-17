"use client";

/** Til/fra-chip, fx til valg af modeller. */
export function Chip({
  selected,
  onToggle,
  children,
  size = "md",
}: {
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  size?: "md" | "sm";
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-light ${
        size === "sm" ? "px-2.5 py-0.5 text-[12px]" : "px-3 py-1 text-[13px]"
      } ${
        selected
          ? "border-green-eco bg-green-eco text-white"
          : "border-sand bg-white text-charcoal hover:border-gray"
      }`}
    >
      {children}
    </button>
  );
}

type PriceProps = {
  amount: string;
  currencyCode?: string;
  compareAt?: string | null;
  className?: string;
  showSavings?: boolean;
};

export function Price({ amount, currencyCode = "DKK", compareAt, className = "", showSavings = true }: PriceProps) {
  const current = parseFloat(amount);
  const original = compareAt ? parseFloat(compareAt) : null;

  const fmt = (value: number) =>
    new Intl.NumberFormat("da-DK", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(value);

  const formatted = fmt(current);
  const formattedCompare = original ? fmt(original) : null;

  const savingsAmount = original && original > current ? original - current : null;
  const formattedSavings = savingsAmount ? fmt(savingsAmount) : null;

  return (
    <div className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className={`text-2xl font-semibold ${compareAt ? "text-green-eco" : "text-charcoal"}`}>
        {formatted}
      </span>
      {formattedCompare && (
        <span className="text-sm text-gray line-through">{formattedCompare}</span>
      )}
      {showSavings && formattedSavings && (
        <span className="inline-flex items-center rounded-full bg-green-eco/10 px-2 py-0.5 text-xs font-semibold text-green-eco">
          Spar {formattedSavings}
        </span>
      )}
    </div>
  );
}

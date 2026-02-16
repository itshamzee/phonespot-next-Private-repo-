type PriceProps = {
  amount: string;
  currencyCode?: string;
  compareAt?: string | null;
  className?: string;
};

export function Price({ amount, currencyCode = "DKK", compareAt, className = "" }: PriceProps) {
  const formatted = new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
  }).format(parseFloat(amount));

  const formattedCompare = compareAt
    ? new Intl.NumberFormat("da-DK", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 0,
      }).format(parseFloat(compareAt))
    : null;

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className={`text-2xl font-semibold ${compareAt ? "text-green-eco" : "text-charcoal"}`}>
        {formatted}
      </span>
      {formattedCompare && (
        <span className="text-sm text-gray line-through">{formattedCompare}</span>
      )}
    </div>
  );
}

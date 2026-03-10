import { KlarnaIcon } from "@/components/ui/payment-icons";

interface KlarnaBannerProps {
  priceAmount: string;
  currencyCode?: string;
  className?: string;
}

function formatInstallment(amount: number, currency: string) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function KlarnaBanner({
  priceAmount,
  currencyCode = "DKK",
  className = "",
}: KlarnaBannerProps) {
  const total = parseFloat(priceAmount);
  if (!total || total <= 0) return null;

  const installment = Math.ceil(total / 3);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#FFB3C7]/25 bg-gradient-to-r from-[#FFB3C7]/[0.07] via-white to-[#FFB3C7]/[0.05] ${className}`.trim()}
    >
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Klarna logo */}
        <KlarnaIcon className="h-9 w-auto shrink-0 rounded" />

        {/* Content */}
        <div className="flex-1">
          <p className="text-sm font-semibold text-charcoal">
            Del betalingen op med Klarna
          </p>
          <p className="mt-0.5 text-xs text-charcoal/60">
            Betal i 3 rentefrie rater af{" "}
            <span className="font-bold text-charcoal/80">
              {formatInstallment(installment, currencyCode)}
            </span>
          </p>
        </div>

        {/* Installment visual */}
        <div className="hidden shrink-0 sm:flex items-center gap-1.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="flex flex-col items-center rounded-lg border border-[#FFB3C7]/20 bg-white px-2.5 py-1.5"
            >
              <span className="text-[10px] font-medium text-charcoal/40">
                {n}. rate
              </span>
              <span className="text-xs font-bold text-charcoal">
                {formatInstallment(installment, currencyCode)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
}: {
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {backHref && (
          <Link href={backHref} className="mb-1 inline-block text-[13px] text-gray hover:text-charcoal">
            ‹ {backLabel ?? "Tilbage"}
          </Link>
        )}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.01em] text-charcoal">{title}</h1>
        {description && <p className="mt-1 max-w-[60ch] text-[14px] text-gray">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

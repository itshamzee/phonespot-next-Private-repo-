import type { ReactNode } from "react";

/**
 * En sektion i en formular eller side. Adskilt med en hårlinje og en titel,
 * ikke med kasser i kasser. Første sektion har ingen streg ovenover.
 */
export function Section({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Noget til højre for titlen, fx en lille knap. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-sand pt-6 first:border-t-0 first:pt-0">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-charcoal">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-gray">{description}</p>}
        </div>
        {aside}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** Hvid flade med hårlinje, til sider hvor indholdet skal stå på baggrunden. */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-sand bg-white p-5 sm:p-6 ${className}`}>{children}</div>;
}

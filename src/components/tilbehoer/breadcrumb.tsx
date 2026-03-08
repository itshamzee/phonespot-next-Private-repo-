import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Brødkrumme" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray">
        <li>
          <Link href="/" className="transition-colors hover:text-charcoal">
            Hjem
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="text-sand">/</span>
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-charcoal">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-charcoal">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

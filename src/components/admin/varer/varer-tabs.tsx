import Link from "next/link";

export type VarerTab = "varer" | "indkoeb" | "bevaegelser" | "overforsler" | "reparationer";

const TABS: { id: VarerTab; label: string; href: string }[] = [
  { id: "varer", label: "Varer", href: "/admin/varer" },
  { id: "indkoeb", label: "Indkøb", href: "/admin/varer?fane=indkoeb" },
  { id: "bevaegelser", label: "Lagerbevægelser", href: "/admin/varer?fane=bevaegelser" },
  { id: "overforsler", label: "Overførsler", href: "/admin/varer/overforsler" },
  { id: "reparationer", label: "Reparationer", href: "/admin/varer/reparationer" },
];

/**
 * Faner for Varer-området. "Overførsler" og "Reparationer" er egne sider; de andre er faner på /admin/varer.
 * Reparationer (priser og modeller, live på hjemmesiden) vises kun for ejer og manager.
 */
export function VarerTabs({
  active,
  transferCount,
  canManageRepairs = false,
}: {
  active: VarerTab;
  transferCount?: number;
  canManageRepairs?: boolean;
}) {
  return (
    <nav aria-label="Varer" className="flex flex-wrap gap-1.5 border-b border-[#E2E5E0]">
      {TABS.filter((t) => t.id !== "reparationer" || canManageRepairs || active === "reparationer").map((t) => {
        const isActive = t.id === active;
        const label = t.id === "overforsler" && transferCount ? `${t.label} (${transferCount})` : t.label;
        return (
          <Link
            key={t.id}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px flex h-10 items-center border-b-2 px-3.5 text-[14px] ${
              isActive
                ? "border-[#1A3D2E] font-semibold text-[#1A3D2E]"
                : "border-transparent text-[#3D4842] hover:text-[#1A3D2E]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

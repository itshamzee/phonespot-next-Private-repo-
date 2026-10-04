import Link from "next/link";

export type VarerTab = "varer" | "indkoeb" | "bevaegelser" | "overforsler";

const TABS: { id: VarerTab; label: string; href: string }[] = [
  { id: "varer", label: "Varer", href: "/admin/varer" },
  { id: "indkoeb", label: "Indkøb", href: "/admin/varer?fane=indkoeb" },
  { id: "bevaegelser", label: "Lagerbevægelser", href: "/admin/varer?fane=bevaegelser" },
  { id: "overforsler", label: "Overførsler", href: "/admin/varer/overforsler" },
];

/** Faner for Varer-området. "Overførsler" er en egen side; de andre er faner på /admin/varer. */
export function VarerTabs({ active, transferCount }: { active: VarerTab; transferCount?: number }) {
  return (
    <nav aria-label="Varer" className="flex flex-wrap gap-1.5 border-b border-[#E2E5E0]">
      {TABS.map((t) => {
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

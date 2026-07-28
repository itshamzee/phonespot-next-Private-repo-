import { normalizeStoreId, storeLabel, type StoreId } from "@/lib/stores";

/**
 * Chip-farver per butik. Cyan og fuchsia er bevidst valgt fordi ingen af
 * admin-listernes status-badges bruger dem (blue/amber/emerald/rose/violet/
 * indigo/orange/teal er alle optaget), og fordi de to er kold/varm-modsatte —
 * adskillelige på et splitsekund.
 */
const STORE_BADGE: Record<StoreId, string> = {
  slagelse: "bg-cyan-500/10 text-cyan-600",
  vejle: "bg-fuchsia-500/10 text-fuchsia-600",
};

export const STORE_DOT: Record<StoreId | "generel", string> = {
  slagelse: "bg-cyan-500",
  vejle: "bg-fuchsia-500",
  generel: "bg-charcoal/20",
};

interface StoreBadgeProps {
  /** Rå butiksværdi — `store_id`, `metadata.preferredStore` el.lign. Normaliseres internt. */
  store?: string | null;
  className?: string;
}

export default function StoreBadge({ store, className = "" }: StoreBadgeProps) {
  const id = normalizeStoreId(store ?? null);
  const styles = id ? STORE_BADGE[id] : "bg-charcoal/[0.05] text-charcoal/40";
  const label = id ? storeLabel(id) : "Generel";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles} ${className}`}>
      {label}
    </span>
  );
}

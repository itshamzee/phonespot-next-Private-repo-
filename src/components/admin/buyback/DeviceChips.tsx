import type { BuybackCondition } from "@/lib/buyback/types";

/* Green for good, amber for wear, rose for damage. */
function conditionTone(value: string): string {
  const v = value.trim().toLowerCase();
  if (!v) return "bg-stone-100 text-stone-500";
  if (["perfekt", "god (80%+)", "ja", "nej"].includes(v)) return "bg-emerald-50 text-emerald-700";
  if (["små ridser", "ridser", "buler/ridser", "okay (60-80%)", "ved ikke"].includes(v)) {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-rose-50 text-rose-700";
}

export function Chip({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] ${conditionTone(value)}`}>
      <span className="opacity-60">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

/** The customer's own description of one device, at a glance. */
export function DeviceChips({ condition }: { condition: BuybackCondition }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Chip label="Skærm" value={condition.screen} />
      <Chip label="Bagside" value={condition.back} />
      <Chip label="Batteri" value={condition.battery} />
      <Chip label="Alt virker" value={condition.allWorking} />
      {condition.cloudLocked && <Chip label="iCloud-låst" value={condition.cloudLocked} />}
      {condition.brokenParts.map((part) => (
        <span
          key={part}
          className="inline-flex items-center rounded-lg bg-rose-50 px-2.5 py-1 text-[12px] font-semibold text-rose-700"
        >
          {part}
        </span>
      ))}
    </div>
  );
}

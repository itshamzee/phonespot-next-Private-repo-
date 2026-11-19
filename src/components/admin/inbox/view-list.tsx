"use client";

import type { InboxView } from "@/lib/inquiries/inbox";
import { Select } from "@/components/admin/ui";
import type { Counts } from "./use-inbox";

type ViewDef = { id: InboxView; label: string; count?: keyof Counts; hot?: boolean };

/** Visningerne i to grupper. Tal kun på de tre første. Tomme kanaler vises stadig. */
export const VIEW_GROUPS: { label: string; views: ViewDef[] }[] = [
  {
    label: "Indbakke",
    views: [
      { id: "mine", label: "Mine", count: "mine" },
      { id: "unassigned", label: "Ikke tildelt", count: "unassigned" },
      { id: "need", label: "Kræver dig", count: "need", hot: true },
      { id: "waiting", label: "Venter på kunden" },
      { id: "snoozed", label: "Udsat" },
      { id: "fiks", label: "Besvaret af Fiks" },
      { id: "done", label: "Færdig" },
    ],
  },
  {
    label: "Kanaler",
    views: [
      { id: "ch-mail", label: "Mail" },
      { id: "ch-chat", label: "Chat på sitet" },
      { id: "ch-messenger", label: "Messenger" },
      { id: "ch-sms", label: "SMS" },
      { id: "ch-form", label: "Formular og opkøb" },
      { id: "ch-reviews", label: "Anmeldelser" },
    ],
  },
];

export function viewLabel(view: InboxView): string {
  for (const g of VIEW_GROUPS) for (const v of g.views) if (v.id === view) return v.label;
  return "Mine";
}

/** Bred skærm: visningerne som en lodret liste til venstre. */
export function ViewList({ view, counts, onChange }: { view: InboxView; counts: Counts; onChange: (v: InboxView) => void }) {
  return (
    <nav aria-label="Visninger" className="flex flex-col px-2.5 py-3.5">
      {VIEW_GROUPS.map((group, gi) => (
        <div key={group.label} className={gi ? "mt-3.5" : ""}>
          <h2 className="mx-2.5 mb-1.5 text-[12px] font-medium text-[#5E6A63]">{group.label}</h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {group.views.map((v) => {
              const active = v.id === view;
              const n = v.count ? counts[v.count] : 0;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => onChange(v.id)}
                    className={`m-press flex h-9 w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[14px] motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2F8F55] ${
                      active ? "bg-green-pale font-semibold text-green-eco" : "text-[#15211B] hover:bg-[#ECEEEA]"
                    }`}
                  >
                    <span className="truncate">{v.label}</span>
                    {v.count && n > 0 && (
                      <span
                        className={`min-w-5 rounded-[10px] px-1.5 py-px text-center text-[12px] font-semibold tabular-nums ${
                          v.hot ? "bg-[#FDECEC] text-[#B42318]" : "border border-[#E2E5E0] bg-white"
                        }`}
                      >
                        {n}
                        <span className="sr-only"> sager</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Smal skærm: visningerne som en Select over listen. */
export function ViewSelect({ view, counts, onChange }: { view: InboxView; counts: Counts; onChange: (v: InboxView) => void }) {
  return (
    <Select aria-label="Visning" value={view} onChange={(e) => onChange(e.target.value as InboxView)}>
      {VIEW_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.views.map((v) => (
            <option key={v.id} value={v.id}>
              {v.count ? `${v.label} (${counts[v.count]})` : v.label}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

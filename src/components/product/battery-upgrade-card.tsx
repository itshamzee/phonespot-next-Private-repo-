"use client";

import { BATTERY_UPGRADE } from "@/lib/campaigns/sommer-bundle";

type Props = {
  selected: boolean;
  onToggle: (next: boolean) => void;
};

function BatteryIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 28 16"
      className="h-5 w-9"
      fill="none"
      aria-hidden
    >
      {/* Battery outline */}
      <rect
        x="0.75"
        y="0.75"
        width="23.5"
        height="14.5"
        rx="3"
        stroke={active ? "#1A3D2E" : "#3a3d38"}
        strokeWidth="1.5"
      />
      {/* Battery cap */}
      <rect
        x="25"
        y="5"
        width="2.5"
        height="6"
        rx="0.8"
        fill={active ? "#1A3D2E" : "#3a3d38"}
      />
      {/* Full fill */}
      <rect
        x="2.5"
        y="2.5"
        width="20"
        height="11"
        rx="1.5"
        fill={active ? "#1A3D2E" : "#5a8c6f"}
      />
      {/* Highlight */}
      <rect
        x="3.5"
        y="3.5"
        width="3"
        height="4"
        rx="0.5"
        fill="rgba(255,255,255,0.35)"
      />
    </svg>
  );
}

export function BatteryUpgradeCard({ selected, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!selected)}
      aria-pressed={selected}
      className={`group w-full rounded-2xl border-2 bg-white p-4 text-left transition-all ${
        selected
          ? "border-[#1A3D2E] shadow-md shadow-[#1A3D2E]/10"
          : "border-[#E5E5EA] hover:border-[#1A3D2E]/40 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Battery icon */}
        <div
          className={`flex h-10 w-12 shrink-0 items-center justify-center rounded-xl ${
            selected ? "bg-[#1A3D2E]/10" : "bg-[#F5F2EC]"
          }`}
        >
          <BatteryIcon active={selected} />
        </div>

        {/* Copy */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-[#111111]">
                Opgrader til nyt 100% batteri
              </p>
              <p className="mt-1 text-[12px] leading-snug text-[#6E6E73]">
                Vores tekniker installerer et nyt originalt batteri inden forsendelse.
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-sm font-bold text-[#1A3D2E] whitespace-nowrap">
                +{(BATTERY_UPGRADE.price_oere / 100).toFixed(0)} kr
              </span>
            </div>
          </div>

          {/* Footer row: SLA tag + Add/Added pill */}
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#86868B]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3 w-3"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM8.75 4a.75.75 0 0 0-1.5 0v4c0 .2.08.39.22.53l2.5 2.5a.75.75 0 1 0 1.06-1.06L8.75 7.69V4Z"
                  clipRule="evenodd"
                />
              </svg>
              Forlænger levering til 2–4 dage
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                selected
                  ? "bg-[#1A3D2E] text-white"
                  : "bg-[#F5F2EC] text-[#1A3D2E] group-hover:bg-[#1A3D2E] group-hover:text-white"
              }`}
            >
              {selected ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-3 w-3"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M13.36 4.21a.75.75 0 0 1 .03 1.06l-6.5 7a.75.75 0 0 1-1.08.02L2.6 9.06a.75.75 0 1 1 1.05-1.07l2.66 2.64 5.99-6.45a.75.75 0 0 1 1.06-.03Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Tilføjet
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-3 w-3"
                    aria-hidden
                  >
                    <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                  Tilføj
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

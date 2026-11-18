"use client";

import { useState } from "react";
import type { StatPayload } from "@/lib/admin/statistik/payload";
import type { Category } from "@/lib/admin/statistik/lines";
import { kr, pct } from "./format";
import { h2Class } from "./styles";

/** Mest solgte: top 5, "Se alle" folder hele listen ud. */

const TOP_SHOWN = 5;
const TYPE_LABELS: Record<Category, string> = {
  enheder: "Enhed",
  tilbehoer: "Tilbehør",
  reparation: "Reparation",
  oevrigt: "Øvrigt",
};

export function TopList({ items, isOwner }: { items: StatPayload["top"]; isOwner: boolean }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, TOP_SHOWN);

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={h2Class}>Mest solgte</h2>
        {items.length > TOP_SHOWN ? (
          <button
            type="button"
            aria-expanded={all}
            onClick={() => setAll((v) => !v)}
            className="cursor-pointer border-0 bg-transparent p-0 text-[15px] text-[#1A3D2E] underline underline-offset-2"
          >
            {all ? "Vis top 5" : "Se alle"}
          </button>
        ) : null}
      </div>
      <div className="mt-3.5">
        {shown.length === 0 ? <p className="m-0 py-3.5 text-[14px] text-[#5E6A63]">Intet solgt i perioden.</p> : null}
        {shown.map((t, i) => (
          <div key={`${t.name}-${i}`} className={`flex items-center justify-between gap-3.5 py-3.5 ${i ? "border-t border-[#EEF0EC]" : ""}`}>
            <span className="min-w-0">
              {t.name}
              <small className="block text-[13px] text-[#5E6A63]">
                {TYPE_LABELS[t.category]} · {t.units} stk.
              </small>
            </span>
            <span className="shrink-0 text-right">
              <b className="tabular-nums">{kr(t.money.revenue)}</b>
              {isOwner && t.money.profit !== undefined ? (
                <small className="block text-[13px] text-[#5E6A63] tabular-nums">
                  Fortjeneste {kr(t.money.profit)} · {pct(t.money.marginPct)}
                </small>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

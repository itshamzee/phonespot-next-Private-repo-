"use client";

import { useMemo, useState } from "react";
import type { ManageModelNode, ManageTreeResponse } from "@/lib/repairs/catalog-manage-types";
import { Badge, btnPrimary, inputCls } from "./ui";

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Mærke, serie og model med søgning. Modeller uden aktive reparationer med pris markeres "Ingen priser". */
export function TreePanel({
  tree,
  selectedId,
  onSelect,
  onNewModel,
}: {
  tree: ManageTreeResponse;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewModel: () => void;
}) {
  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const needle = norm(q);
  const filtering = needle !== "" || onlyMissing;

  const missingTotal = useMemo(
    () => tree.parents.reduce((n, p) => n + p.brands.reduce((m, b) => m + b.series.reduce((k, s) => k + s.models.filter((x) => x.live_services === 0).length, 0), 0), 0),
    [tree],
  );

  // Hvilke mærker og serier skal stå åbne som standard: dem med den valgte model.
  const selectedPath = findSelectedPath(tree, selectedId);

  const isOpen = (key: string, fallback: boolean) => (filtering ? true : (toggled[key] ?? fallback));
  const toggle = (key: string, fallback: boolean) => setToggled((t) => ({ ...t, [key]: !(t[key] ?? fallback) }));

  const matches = (m: ManageModelNode, brandName: string, seriesName: string) =>
    (!onlyMissing || m.live_services === 0) && (needle === "" || norm(`${brandName} ${seriesName} ${m.name}`).includes(needle));

  let shown = 0;

  return (
    <aside className="flex flex-col gap-3 rounded-xl border border-[#E2E5E0] bg-white p-3.5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-32px)]">
      <div className="flex gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søg model, fx iphone 18"
          aria-label="Søg model"
          className={inputCls}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[13px] text-[#3D4842]">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="accent-[#1A3D2E]" />
          Kun uden priser ({missingTotal})
        </label>
        <button type="button" onClick={onNewModel} className={`${btnPrimary} !h-8 !px-3 !text-[13px]`}>
          Ny model
        </button>
      </div>

      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {tree.parents.map((parent) => {
          const brandNodes = parent.brands.map((brand) => {
            const seriesNodes = brand.series
              .map((series) => ({ series, models: series.models.filter((m) => matches(m, brand.name, series.name)) }))
              .filter((s) => s.models.length > 0);
            return { brand, seriesNodes };
          });
          const visible = brandNodes.filter((b) => b.seriesNodes.length > 0);
          if (visible.length === 0) return null;
          return (
            <section key={parent.key} className="mb-3">
              <h3 className="px-1 pb-1 text-[12px] font-semibold text-[#5E6A63]">{parent.name}</h3>
              {visible.map(({ brand, seriesNodes }) => {
                const brandOpen = isOpen(brand.id, selectedPath?.brand === brand.id);
                return (
                  <div key={brand.id}>
                    <button
                      type="button"
                      onClick={() => toggle(brand.id, selectedPath?.brand === brand.id)}
                      aria-expanded={brandOpen}
                      className="flex h-9 w-full items-center justify-between rounded-lg px-2 text-left text-[14px] font-semibold hover:bg-[#F5F6F4]"
                    >
                      <span>{brand.name}</span>
                      <span aria-hidden className="text-[12px] text-[#5E6A63]">
                        {brandOpen ? "−" : "+"}
                      </span>
                    </button>
                    {brandOpen &&
                      seriesNodes.map(({ series, models }) => {
                        const key = `${brand.id}:${series.name}`;
                        const open = isOpen(key, selectedPath?.series === key);
                        const missing = models.filter((m) => m.live_services === 0).length;
                        return (
                          <div key={key} className="ml-2 border-l border-[#E2E5E0] pl-1.5">
                            <button
                              type="button"
                              onClick={() => toggle(key, selectedPath?.series === key)}
                              aria-expanded={open}
                              className="flex h-8 w-full items-center justify-between rounded-lg px-2 text-left text-[13px] text-[#3D4842] hover:bg-[#F5F6F4]"
                            >
                              <span>{series.name}</span>
                              <span className="flex items-center gap-1.5">
                                {missing > 0 && <Badge tone="amber">{missing} uden priser</Badge>}
                                <span aria-hidden className="text-[12px] text-[#5E6A63]">
                                  {open ? "−" : "+"}
                                </span>
                              </span>
                            </button>
                            {open &&
                              models.map((m) => {
                                shown += 1;
                                const selected = m.id === selectedId;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => onSelect(m.id)}
                                    aria-current={selected ? "true" : undefined}
                                    className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[14px] ${
                                      selected ? "bg-[#E7EFE9] font-semibold text-[#1A3D2E]" : "hover:bg-[#F5F6F4]"
                                    }`}
                                  >
                                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                                    {!m.active && <Badge tone="grey">Skjult</Badge>}
                                    {m.live_services === 0 && <Badge tone="amber">Ingen priser</Badge>}
                                  </button>
                                );
                              })}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </section>
          );
        })}
        {filtering && shown === 0 && <p className="px-2 py-6 text-center text-[14px] text-[#5E6A63]">Ingen modeller matcher.</p>}
      </div>
    </aside>
  );
}

function findSelectedPath(tree: ManageTreeResponse, selectedId: string | null): { brand: string; series: string } | null {
  for (const p of tree.parents)
    for (const b of p.brands)
      for (const s of b.series) if (s.models.some((m) => m.id === selectedId)) return { brand: b.id, series: `${b.id}:${s.name}` };
  return null;
}

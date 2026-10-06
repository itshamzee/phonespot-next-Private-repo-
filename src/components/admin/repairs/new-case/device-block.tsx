"use client";

import { useEffect, useRef } from "react";
import { formatKrShort } from "@/lib/repairs/case-money";
import type { CatalogTreeResponse } from "@/lib/repairs/new-case-types";
import { fetchModelServices } from "./api";
import { AddonsSection } from "./addons-section";
import { DetailsSection } from "./details-section";
import { DeviceSection, type SelectedModel } from "./device-section";
import { deviceSummaryText, newKey, type DeviceDraft, type DeviceSectionId, type DeviceView } from "./devices";
import {
  checklistSummary,
  defaultService,
  formatPromised,
  totalOere,
  type CatalogService,
  type ExistingCustomer,
  type LocationSlug,
  type ServiceCategory,
} from "./logic";
import { RepairSection } from "./repair-section";
import { SectionCard, focusRing } from "./section-card";

type Patch = Partial<DeviceDraft> | ((d: DeviceDraft) => Partial<DeviceDraft>);

type Props = {
  draft: DeviceDraft;
  view: DeviceView;
  /** 0-baseret placering og antal enheder. Med én enhed vises ingen ramme om sektionerne. */
  index: number;
  count: number;
  location: LocationSlug | null;
  displayLocation: LocationSlug;
  tree: CatalogTreeResponse | null;
  treeError: string;
  onRetryTree: () => void;
  customer: ExistingCustomer | null;
  now: Date;
  /** Foldet ud (med flere enheder er kun én ad gangen det). */
  expanded: boolean;
  /** Den åbne sektion i denne enhed, eller null (fx mens kunden redigeres). */
  activeSection: DeviceSectionId | null;
  onGo: (section: DeviceSectionId) => void;
  onExpand: () => void;
  onRemove: () => void;
  onPatch: (key: string, patch: Patch) => void;
};

/** Én enheds blok i Ny sag: model, IMEI m.m., reparation, tilkøb og detaljer. */
export function DeviceBlock(p: Props) {
  const { draft: d, view: v, index, count } = p;
  const multi = count > 1;
  const ref = useRef<HTMLElement>(null);
  const patch = (x: Patch) => p.onPatch(d.key, x);
  const model = d.model;

  // Reparationer og priser for modellen i den valgte butik.
  const svcKey = model ? `${model.id}|${p.location ?? ""}` : null;
  const patchRef = useRef(p.onPatch);
  useEffect(() => {
    patchRef.current = p.onPatch;
  });
  useEffect(() => {
    if (!svcKey || !model) return;
    const ctrl = new AbortController();
    fetchModelServices(model.id, p.location, ctrl.signal)
      .then((data) => patchRef.current(d.key, { svc: { key: svcKey, data, error: "" } }))
      .catch((err) => {
        if ((err as { name?: string })?.name !== "AbortError")
          patchRef.current(d.key, { svc: { key: svcKey, data: null, error: err instanceof Error ? err.message : "Reparationer kunne ikke hentes." } });
      });
    return () => ctrl.abort();
    // model.id og location indgår i svcKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcKey, d.svcTry]);

  function pickModel(m: SelectedModel) {
    patch((cur) => ({ model: m, ...(cur.model?.id !== m.id ? { selected: {}, viewingState: null } : {}) }));
    // Fokus til IMEI-feltet: scanneren kan bruges med det samme.
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>("[data-imei]")?.focus({ preventScroll: true }));
  }

  function chipClick(cat: ServiceCategory) {
    const chosen = d.selected[cat.name];
    if (!chosen) {
      const def = defaultService(cat, p.displayLocation);
      patch((cur) => ({ ...(def ? { selected: { ...cur.selected, [cat.name]: def.id } } : {}), viewingState: cat.name }));
    } else if (v.viewing === cat.name) {
      patch((cur) => {
        const next = { ...cur.selected };
        delete next[cat.name];
        return { selected: next };
      });
    } else {
      patch({ viewingState: cat.name });
    }
  }

  function toggleService(cat: ServiceCategory, s: CatalogService) {
    patch((cur) => {
      const next = { ...cur.selected };
      if (next[cat.name] === s.id) delete next[cat.name];
      else next[cat.name] = s.id;
      return { selected: next };
    });
  }

  const sid = `sec-${d.key}`;
  const step = multi ? 0 : 1; // 2-5 på en enkelt enhed (kunden er 1); 1-4 inde i en enhedsblok
  const active = p.activeSection;

  const repairLabels = v.lines.filter((l) => l.kind !== "addon");
  const repairSummary = repairLabels.length > 0 ? `${repairLabels.map((l) => l.label).join(", ")} · ${formatKrShort(totalOere(repairLabels))}` : null;
  const addonSummary = d.addons.length > 0 ? `${d.addons.length} tilkøb` : null;
  const detailsSummary = `lovet klar ${formatPromised(v.promisedAt, p.now)} · ansvarlig ${v.assignedTo || "ikke valgt"} · ${checklistSummary(d.checklist)}`;

  const sections = (
    <>
      <SectionCard id={`${sid}-device`} step={step + 1} title="Enhed" summary={deviceSummaryText(d)} open={active === "device"} onOpen={() => p.onGo("device")}>
        <DeviceSection
          tree={p.tree}
          treeError={p.treeError}
          onRetry={p.onRetryTree}
          model={model}
          onModel={pickModel}
          fields={d.fields}
          onFields={(fields) => patch({ fields })}
          customer={p.customer}
          onDone={() => p.onGo("repair")}
        />
      </SectionCard>

      <SectionCard
        id={`${sid}-repair`}
        step={step + 2}
        title="Reparation"
        hint={model ? `${model.name} · priser fra hjemmesiden` : undefined}
        summary={repairSummary}
        open={active === "repair"}
        onOpen={() => p.onGo("repair")}
      >
        <RepairSection
          modelName={model?.name ?? null}
          loading={v.svcLoading}
          error={v.svcUsable?.error ?? ""}
          onRetry={() => patch((cur) => ({ svc: null, svcTry: cur.svcTry + 1 }))}
          categories={v.categories}
          location={p.displayLocation}
          selected={d.selected}
          viewing={v.viewing}
          onChipClick={chipClick}
          onToggleService={toggleService}
          free={d.free}
          onAddFree={(t) => patch((cur) => ({ free: [...cur.free, { id: newKey(), ...t }] }))}
          onRemoveFree={(id) => patch((cur) => ({ free: cur.free.filter((x) => x.id !== id) }))}
          onDone={() => p.onGo("addons")}
        />
      </SectionCard>

      <SectionCard id={`${sid}-addons`} step={step + 3} title="Tilkøb" summary={addonSummary} open={active === "addons"} onOpen={() => p.onGo("addons")}>
        <AddonsSection
          modelId={model?.id ?? null}
          modelName={model?.name ?? null}
          location={p.displayLocation}
          addons={d.addons}
          onAdd={(l) => patch((cur) => ({ addons: [...cur.addons, l] }))}
          onRemove={(key) => patch((cur) => ({ addons: cur.addons.filter((x) => x.key !== key) }))}
          onQty={(key, qty) => patch((cur) => ({ addons: cur.addons.map((x) => (x.key === key ? { ...x, qty: Math.max(1, qty) } : x)) }))}
          onDone={() => p.onGo("details")}
        />
      </SectionCard>

      <SectionCard id={`${sid}-details`} step={step + 4} title="Detaljer" summary={detailsSummary} open={active === "details"} onOpen={() => p.onGo("details")}>
        <DetailsSection
          issue={d.issue}
          onIssue={(issue) => patch({ issue })}
          checklist={d.checklist}
          onChecklist={(checklist) => patch({ checklist })}
          promisedAt={v.promisedAt}
          onPromisedAt={(promisedOverride) => patch({ promisedOverride })}
          assignedTo={v.assignedTo}
          onAssignedTo={(assignedOverride) => patch({ assignedOverride })}
          notes={d.notes}
          onNotes={(notes) => patch({ notes })}
          photos={d.photos}
          onPhotos={(photos) => patch({ photos })}
        />
      </SectionCard>
    </>
  );

  if (!multi)
    return (
      <section ref={ref} className="flex flex-col gap-4">
        {sections}
      </section>
    );

  const title = `Enhed ${index + 1}`;
  const summary = deviceSummaryText(d);
  if (!p.expanded) {
    return (
      <section aria-label={title} className="rounded-xl border border-[#E2E5E0] bg-white" data-device-block={index + 1}>
        <button type="button" aria-expanded={false} onClick={p.onExpand} className={`flex w-full items-center justify-between gap-4 rounded-xl px-5 py-4 text-left ${focusRing}`}>
          <span className="min-w-0 text-[17px]">
            <span className="font-semibold">{title}</span>
            <span className="ml-2 text-sm font-normal text-[#3D4842]">
              {summary ? `· ${summary}` : "· ikke valgt endnu"}
              {v.total_oere > 0 ? ` · ${formatKrShort(v.total_oere)}` : ""}
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-[#1A3D2E]">Ret</span>
        </button>
      </section>
    );
  }

  return (
    <section aria-label={title} ref={ref} className="flex flex-col gap-3 rounded-2xl border-2 border-[#1A3D2E]/25 bg-[#FAFBF9] p-3" data-device-block={index + 1}>
      <div className="flex items-center justify-between gap-3 px-2">
        <h2 className="m-0 text-[17px] font-semibold">{title}</h2>
        <button type="button" onClick={p.onRemove} className={`rounded-lg px-2 py-1 text-sm text-[#B42318] hover:bg-[#FDECEC] ${focusRing}`}>
          Fjern enhed
        </button>
      </div>
      {sections}
    </section>
  );
}

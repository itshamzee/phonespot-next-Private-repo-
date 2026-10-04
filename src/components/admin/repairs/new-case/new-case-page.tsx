"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useStoreScope } from "@/components/admin/shell/store-scope-context";
import { formatKrShort } from "@/lib/repairs/case-money";
import { INITIAL_CHECKLIST } from "@/lib/repairs/intake-checklist";
import type { CatalogTreeResponse, CreateRepairCaseRequest, CreateRepairCaseResponse, RepairServicesResponse } from "@/lib/repairs/new-case-types";
import type { ChecklistItem } from "@/lib/supabase/types";
import { createCase, fetchModelServices, fetchTree } from "./api";
import { AddonsSection } from "./addons-section";
import { CustomerSection, CustomerTypeToggle } from "./customer-section";
import { DetailsSection } from "./details-section";
import { DeviceSection, type DeviceFields, type SelectedModel } from "./device-section";
import {
  EMPTY_CUSTOMER,
  buildPanelLines,
  buildRequest,
  checklistSummary,
  customerValid,
  defaultPromisedAt,
  defaultService,
  depositHint,
  formatPhoneDk,
  formatPromised,
  hasBackorder,
  toLocalInput,
  totalOere,
  type AddonLine,
  type CatalogService,
  type CustomerDraft,
  type ExistingCustomer,
  type FreeTask,
  type LocationSlug,
  type PanelLine,
  type ServiceCategory,
} from "./logic";
import { RepairSection } from "./repair-section";
import { SectionCard } from "./section-card";
import { SuccessScreen } from "./success-screen";
import { SummaryPanel } from "./summary-panel";

type SectionId = "customer" | "device" | "repair" | "addons" | "details";
const ORDER: SectionId[] = ["customer", "device", "repair", "addons", "details"];

function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function physical(v: unknown): LocationSlug | null {
  return v === "vejle" || v === "slagelse" ? v : null;
}

export default function NewCasePage() {
  const [epoch, setEpoch] = useState(0);
  return <NewCaseForm key={epoch} onReset={() => setEpoch((e) => e + 1)} />;
}

function NewCaseForm({ onReset }: { onReset: () => void }) {
  const { me, isOwner, scope, ownSlug } = useStoreScope();

  // Butik: medarbejdere altid egen butik, ejeren den valgte i topbjælken; kun ejeren i
  // "Alle"/"Webshop" vælger selv. Serveren afgør det endelige valg alligevel.
  const forced = isOwner ? physical(scope) : physical(ownSlug);
  const pickStore = isOwner && !forced;
  const [pickedStore, setPickedStore] = useState<LocationSlug | null>(null);
  const location: LocationSlug | null = forced ?? pickedStore;
  const displayLocation: LocationSlug = location ?? "vejle";

  const [idempotencyKey] = useState(newKey);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const [active, setActive] = useState<SectionId>("customer");

  // Kunde
  const [customerType, setCustomerType] = useState<"privat" | "erhverv">("privat");
  const [existing, setExisting] = useState<ExistingCustomer | null>(null);
  const [draft, setDraft] = useState<CustomerDraft>(EMPTY_CUSTOMER);

  // Enhed
  const [model, setModel] = useState<SelectedModel | null>(null);
  const [fields, setFields] = useState<DeviceFields>({ serial: "", color: "", passcode: "" });
  const [tree, setTree] = useState<CatalogTreeResponse | null>(null);
  const [treeError, setTreeError] = useState("");
  const [treeTry, setTreeTry] = useState(0);

  // Reparation
  const [svc, setSvc] = useState<{ key: string; data: RepairServicesResponse | null; error: string } | null>(null);
  const [svcTry, setSvcTry] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [viewingState, setViewingState] = useState<string | null>(null);
  const [free, setFree] = useState<FreeTask[]>([]);

  // Tilkøb
  const [addons, setAddons] = useState<AddonLine[]>([]);

  // Detaljer
  const [issue, setIssue] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
  const [promisedOverride, setPromisedOverride] = useState<string | null>(null);
  const [assignedOverride, setAssignedOverride] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  // Panel / oprettelse
  const [sendSms, setSendSms] = useState(true);
  const [print, setPrint] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ result: CreateRepairCaseResponse; request: CreateRepairCaseRequest } | null>(null);
  const inFlight = useRef(false);

  /* ----------------------------- data ------------------------------ */

  useEffect(() => {
    const ctrl = new AbortController();
    fetchTree(ctrl.signal)
      .then((t) => {
        setTree(t);
        setTreeError("");
      })
      .catch((err) => {
        if ((err as { name?: string })?.name !== "AbortError") setTreeError(err instanceof Error ? err.message : "Kataloget kunne ikke hentes.");
      });
    return () => ctrl.abort();
  }, [treeTry]);

  const svcKey = model ? `${model.id}|${location ?? ""}` : null;
  useEffect(() => {
    if (!svcKey || !model) return;
    const ctrl = new AbortController();
    fetchModelServices(model.id, location, ctrl.signal)
      .then((data) => setSvc({ key: svcKey, data, error: "" }))
      .catch((err) => {
        if ((err as { name?: string })?.name !== "AbortError") setSvc({ key: svcKey, data: null, error: err instanceof Error ? err.message : "Reparationer kunne ikke hentes." });
      });
    return () => ctrl.abort();
    // model.id og location indgår i svcKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcKey, svcTry]);

  const svcUsable = svc && model && svc.key.startsWith(`${model.id}|`) ? svc : null;
  const svcLoading = svcKey !== null && svc?.key !== svcKey;
  const categories: ServiceCategory[] = useMemo(() => svcUsable?.data?.categories ?? [], [svcUsable]);
  const viewing = viewingState ?? categories[0]?.name ?? null;

  /* ----------------------------- afledt ---------------------------- */

  const lines: PanelLine[] = useMemo(
    () => buildPanelLines({ categories, selected, free, addons, location: displayLocation }),
    [categories, selected, free, addons, displayLocation],
  );
  const total = totalOere(lines);
  const needsDeposit = depositHint(lines);
  const backorder = hasBackorder(lines);

  const maxMinutes = useMemo(() => {
    let m: number | null = null;
    for (const c of categories) {
      const s = c.services.find((x) => x.id === selected[c.name]);
      if (s?.estimated_minutes) m = Math.max(m ?? 0, s.estimated_minutes);
    }
    return m;
  }, [categories, selected]);

  const promisedAt = promisedOverride ?? toLocalInput(defaultPromisedAt(now, maxMinutes, backorder));
  const assignedTo = assignedOverride ?? me?.name ?? "";

  const customerOk = existing !== null || customerValid(draft);
  const customerName = existing?.name ?? (customerValid(draft) ? draft.name.trim() : null);
  const customerPhone = existing?.phone ?? draft.phone;
  const hasRepair = lines.some((l) => l.kind !== "addon");

  const missing: string[] = [];
  if (!customerOk) missing.push("kunde");
  if (!model) missing.push("enhed");
  if (!hasRepair) missing.push("mindst én reparation");
  if (!location) missing.push(pickStore ? "butik" : "butik (din bruger har ingen)");
  const canSubmit = missing.length === 0;

  /* ---------------------------- handlers --------------------------- */

  const go = useCallback((id: SectionId) => setActive(id), []);

  function changeType(t: "privat" | "erhverv") {
    setCustomerType(t);
    if (existing && existing.type !== t) setExisting(null);
  }

  function pickExisting(c: ExistingCustomer) {
    setExisting(c);
    setCustomerType(c.type);
    go("device");
  }

  function pickModel(m: SelectedModel) {
    if (model?.id !== m.id) {
      setSelected({});
      setViewingState(null);
    }
    setModel(m);
    // Fokus til IMEI-feltet: scanneren kan bruges med det samme.
    requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-imei]")?.focus({ preventScroll: true }));
  }

  function chipClick(cat: ServiceCategory) {
    const chosen = selected[cat.name];
    if (!chosen) {
      const d = defaultService(cat, displayLocation);
      if (d) setSelected((s) => ({ ...s, [cat.name]: d.id }));
      setViewingState(cat.name);
    } else if (viewing === cat.name) {
      setSelected((s) => {
        const next = { ...s };
        delete next[cat.name];
        return next;
      });
    } else {
      setViewingState(cat.name);
    }
  }

  function toggleService(cat: ServiceCategory, s: CatalogService) {
    setSelected((cur) => {
      const next = { ...cur };
      if (next[cat.name] === s.id) delete next[cat.name];
      else next[cat.name] = s.id;
      return next;
    });
  }

  function removeLine(line: PanelLine) {
    if (line.kind === "repair") {
      const cat = categories.find((c) => c.services.some((s) => `svc:${s.id}` === line.key));
      if (cat)
        setSelected((cur) => {
          const next = { ...cur };
          delete next[cat.name];
          return next;
        });
    } else if (line.kind === "free") {
      setFree((f) => f.filter((x) => `free:${x.id}` !== line.key));
    } else {
      setAddons((a) => a.filter((x) => `addon:${x.key}` !== line.key));
    }
  }

  const submit = useCallback(async () => {
    if (!canSubmit || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError("");
    const request = buildRequest({
      customerType,
      existing,
      draft,
      storeId: isOwner ? location : null,
      model: model ? { id: model.id, name: model.name, brandName: model.brandName } : null,
      device: { serial: fields.serial, color: fields.color, passcode: fields.passcode },
      categories,
      selected,
      free,
      addons,
      checklist,
      photos,
      notes,
      promisedAt,
      assignedTo,
      sendSms,
    });
    try {
      const result = await createCase(request, idempotencyKey);
      setDone({ result, request });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sagen kunne ikke oprettes. Prøv igen.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [canSubmit, customerType, existing, draft, isOwner, location, model, fields, categories, selected, free, addons, checklist, photos, notes, promisedAt, assignedTo, sendSms, idempotencyKey]);

  // Ctrl+Enter opretter sagen fra hvor som helst på siden.
  useEffect(() => {
    if (done) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, submit]);

  // Esc åbner den forrige sektion igen (felter der bruger Esc selv, markerer den som håndteret).
  function onRootKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    const i = ORDER.indexOf(active);
    if (i > 0) {
      e.preventDefault();
      go(ORDER[i - 1]);
    }
  }

  /* ----------------------------- visning --------------------------- */

  if (done) {
    return <SuccessScreen result={done.result} request={done.request} autoPrint={print} onReset={onReset} />;
  }

  const customerSummary = customerName ? `${customerName} · ${customerType === "erhverv" ? "Erhverv" : "Privat"} · ${formatPhoneDk(customerPhone)}` : null;
  const deviceSummary = model ? `${model.name} · ${fields.serial.trim() ? fields.serial.trim() : "IMEI mangler"}` : null;
  const repairLabels = lines.filter((l) => l.kind !== "addon");
  const repairSummary =
    repairLabels.length > 0
      ? `${repairLabels.map((l) => l.label).join(", ")} · ${formatKrShort(totalOere(repairLabels))}`
      : null;
  const addonSummary = addons.length > 0 ? `${addons.length} ${addons.length === 1 ? "tilkøb" : "tilkøb"}` : null;
  const detailsSummary = `lovet klar ${formatPromised(promisedAt, now)} · ansvarlig ${assignedTo || "ikke valgt"} · ${checklistSummary(checklist)}`;

  return (
    <div className="flex min-h-full flex-wrap" onKeyDown={onRootKeyDown}>
      <main className="flex min-w-0 flex-[999_1_640px] flex-col gap-4 px-4 py-6 sm:px-8">
        <Link href="/admin/reparationer" className="text-sm text-[#1A3D2E] no-underline hover:underline">
          ← Sagsstyring
        </Link>
        <h1 className="m-0 text-[32px] font-bold tracking-[-0.02em] text-[#15211B]">Ny sag</h1>

        <SectionCard
          id="sec-customer"
          step={1}
          title="Kunde"
          summary={customerSummary}
          open={active === "customer"}
          onOpen={() => go("customer")}
          headerExtra={<CustomerTypeToggle value={customerType} onChange={changeType} />}
        >
          <CustomerSection
            customerType={customerType}
            onTypeChange={changeType}
            existing={existing}
            draft={draft}
            onDraftChange={setDraft}
            confirmed={!existing && customerValid(draft)}
            onPick={pickExisting}
            onConfirmDraft={() => go("device")}
            onClear={() => {
              setExisting(null);
              setDraft(EMPTY_CUSTOMER);
            }}
          />
        </SectionCard>

        <SectionCard id="sec-device" step={2} title="Enhed" summary={deviceSummary} open={active === "device"} onOpen={() => go("device")}>
          <DeviceSection
            tree={tree}
            treeError={treeError}
            onRetry={() => setTreeTry((n) => n + 1)}
            model={model}
            onModel={pickModel}
            fields={fields}
            onFields={setFields}
            customer={existing}
            onDone={() => go("repair")}
          />
        </SectionCard>

        <SectionCard
          id="sec-repair"
          step={3}
          title="Reparation"
          hint={model ? `${model.name} · priser fra hjemmesiden` : undefined}
          summary={repairSummary}
          open={active === "repair"}
          onOpen={() => go("repair")}
        >
          <RepairSection
            modelName={model?.name ?? null}
            loading={svcLoading}
            error={svcUsable?.error ?? ""}
            onRetry={() => {
              setSvc(null);
              setSvcTry((n) => n + 1);
            }}
            categories={categories}
            location={displayLocation}
            selected={selected}
            viewing={viewing}
            onChipClick={chipClick}
            onToggleService={toggleService}
            free={free}
            onAddFree={(t) => setFree((f) => [...f, { id: newKey(), ...t }])}
            onRemoveFree={(id) => setFree((f) => f.filter((x) => x.id !== id))}
            onDone={() => go("addons")}
          />
        </SectionCard>

        <SectionCard id="sec-addons" step={4} title="Tilkøb" summary={addonSummary} open={active === "addons"} onOpen={() => go("addons")}>
          <AddonsSection
            modelId={model?.id ?? null}
            modelName={model?.name ?? null}
            location={displayLocation}
            addons={addons}
            onAdd={(l) => setAddons((a) => [...a, l])}
            onRemove={(key) => setAddons((a) => a.filter((x) => x.key !== key))}
            onQty={(key, qty) => setAddons((a) => a.map((x) => (x.key === key ? { ...x, qty: Math.max(1, qty) } : x)))}
            onDone={() => go("details")}
          />
        </SectionCard>

        <SectionCard id="sec-details" step={5} title="Detaljer" summary={detailsSummary} open={active === "details"} onOpen={() => go("details")}>
          <DetailsSection
            issue={issue}
            onIssue={setIssue}
            checklist={checklist}
            onChecklist={setChecklist}
            promisedAt={promisedAt}
            onPromisedAt={setPromisedOverride}
            assignedTo={assignedTo}
            onAssignedTo={setAssignedOverride}
            notes={notes}
            onNotes={setNotes}
            photos={photos}
            onPhotos={setPhotos}
          />
        </SectionCard>
      </main>

      <SummaryPanel
        customerName={customerName}
        customerSub={`${customerType === "erhverv" ? "Erhverv" : "Privat"} · ${formatPhoneDk(customerPhone)}`}
        deviceName={model?.name ?? null}
        deviceSub={fields.serial.trim() ? fields.serial.trim() : "IMEI mangler"}
        lines={lines}
        total_oere={total}
        depositHint={needsDeposit}
        onRemoveLine={removeLine}
        sendSms={sendSms}
        onSendSms={setSendSms}
        print={print}
        onPrint={setPrint}
        pickStore={pickStore}
        location={location}
        onLocation={setPickedStore}
        missing={missing}
        submitting={submitting}
        error={error}
        canSubmit={canSubmit}
        onSubmit={() => void submit()}
      />
    </div>
  );
}

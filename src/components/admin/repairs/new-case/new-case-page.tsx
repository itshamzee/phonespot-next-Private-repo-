"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useStoreScope } from "@/components/admin/shell/store-scope-context";
import { formatKr } from "@/lib/repairs/case-money";
import type {
  CatalogTreeResponse,
  CreateRepairCaseGroupRequest,
  CreateRepairCaseGroupResponse,
  CreateRepairCaseRequest,
  CreateRepairCaseResponse,
} from "@/lib/repairs/new-case-types";
import { createCase, createCaseGroup, fetchTree } from "./api";
import { CustomerSection, CustomerTypeToggle } from "./customer-section";
import { DeviceBlock } from "./device-block";
import {
  MAX_DEVICES,
  buildGroupRequest,
  buildSingleRequest,
  deriveDevice,
  grandTotalOere,
  newDraft,
  newKey,
  previousSection,
  removeLineFrom,
  type DeviceDraft,
  type DeviceSectionId,
} from "./devices";
import { EMPTY_CUSTOMER, customerValid, formatPhoneDk, type CustomerDraft, type ExistingCustomer, type LocationSlug, type PanelLine } from "./logic";
import { GroupSuccessScreen } from "./group-success-screen";
import { SectionCard } from "./section-card";
import { SuccessScreen } from "./success-screen";
import { SummaryPanel, type PanelDevice } from "./summary-panel";

type Active = { kind: "customer" } | { kind: "device"; key: string; section: DeviceSectionId };

type Done =
  | { kind: "single"; result: CreateRepairCaseResponse; request: CreateRepairCaseRequest }
  | { kind: "group"; result: CreateRepairCaseGroupResponse; request: CreateRepairCaseGroupRequest };

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

  // Én nøgle for hele indleveringen (også med flere enheder).
  const [idempotencyKey] = useState(newKey);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Kunde (deles af alle enheder)
  const [customerType, setCustomerType] = useState<"privat" | "erhverv">("privat");
  const [existing, setExisting] = useState<ExistingCustomer | null>(null);
  const [draft, setDraft] = useState<CustomerDraft>(EMPTY_CUSTOMER);

  // Enheder: hver bliver til sin egen sag
  const [devices, setDevices] = useState<DeviceDraft[]>(() => [newDraft(newKey())]);
  const [expandedKey, setExpandedKey] = useState<string>(() => "");
  const [active, setActive] = useState<Active>({ kind: "customer" });
  const [tree, setTree] = useState<CatalogTreeResponse | null>(null);
  const [treeError, setTreeError] = useState("");
  const [treeTry, setTreeTry] = useState(0);

  // Panel / oprettelse
  const [sendSms, setSendSms] = useState(true);
  const [print, setPrint] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);
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

  /* ----------------------------- afledt ---------------------------- */

  const meName = me?.name ?? "";
  const views = useMemo(
    () => devices.map((d) => deriveDevice(d, location, displayLocation, now, meName)),
    [devices, location, displayLocation, now, meName],
  );
  const multi = devices.length > 1;
  const total = grandTotalOere(views);
  const openKey = expandedKey || devices[0].key;

  const customerOk = existing !== null || customerValid(draft);
  const customerName = existing?.name ?? (customerValid(draft) ? draft.name.trim() : null);
  const customerPhone = existing?.phone ?? draft.phone;

  const missing: string[] = [];
  if (!customerOk) missing.push("kunde");
  devices.forEach((d, i) => {
    const n = multi ? ` ${i + 1}` : "";
    if (!d.model) missing.push(`enhed${n}`);
    if (!views[i].hasRepair) missing.push(multi ? `reparation på enhed ${i + 1}` : "mindst én reparation");
  });
  if (!location) missing.push(pickStore ? "butik" : "butik (din bruger har ingen)");
  const canSubmit = missing.length === 0;

  /* ---------------------------- handlers --------------------------- */

  const patchDevice = useCallback((key: string, patch: Partial<DeviceDraft> | ((d: DeviceDraft) => Partial<DeviceDraft>)) => {
    setDevices((ds) => ds.map((d) => (d.key === key ? { ...d, ...(typeof patch === "function" ? patch(d) : patch) } : d)));
  }, []);

  const goDevice = (key: string, section: DeviceSectionId) => {
    setExpandedKey(key);
    setActive({ kind: "device", key, section });
  };

  function changeType(t: "privat" | "erhverv") {
    setCustomerType(t);
    if (existing && existing.type !== t) setExisting(null);
  }

  function pickExisting(c: ExistingCustomer) {
    setExisting(c);
    setCustomerType(c.type);
    goDevice(openKey, "device");
  }

  const addDevice = useCallback(() => {
    if (devices.length >= MAX_DEVICES) return;
    const key = newKey();
    setDevices((ds) => (ds.length >= MAX_DEVICES ? ds : [...ds, newDraft(key)]));
    // Enhed 1 folder sig sammen til en opsummering; den nye enhed er åben.
    setExpandedKey(key);
    setActive({ kind: "device", key, section: "device" });
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-device-block="${devices.length + 1}"] [data-autofocus]`)?.focus({ preventScroll: true });
    });
  }, [devices.length]);

  function expandDevice(key: string) {
    const d = devices.find((x) => x.key === key);
    goDevice(key, d?.model ? "repair" : "device");
  }

  function removeDevice(key: string) {
    if (devices.length <= 1) return;
    const rest = devices.filter((d) => d.key !== key);
    setDevices(rest);
    if (openKey === key || (active.kind === "device" && active.key === key)) {
      const next = rest[rest.length - 1];
      goDevice(next.key, next.model ? "repair" : "device");
    }
  }

  function removeLine(deviceKey: string, line: PanelLine) {
    const i = devices.findIndex((d) => d.key === deviceKey);
    if (i < 0) return;
    patchDevice(deviceKey, removeLineFrom(devices[i], views[i].categories, line));
  }

  const submit = useCallback(async () => {
    if (!canSubmit || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError("");
    const shared = { customerType, existing, draft, storeId: isOwner ? location : null, sendSms };
    try {
      if (devices.length === 1) {
        const request = buildSingleRequest(shared, devices[0], views[0]);
        const result = await createCase(request, idempotencyKey);
        setDone({ kind: "single", result, request });
      } else {
        const request = buildGroupRequest(shared, devices.map((d, i) => ({ draft: d, view: views[i] })));
        const result = await createCaseGroup(request, idempotencyKey);
        setDone({ kind: "group", result, request });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sagen kunne ikke oprettes. Prøv igen.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [canSubmit, customerType, existing, draft, isOwner, location, sendSms, devices, views, idempotencyKey]);

  // Ctrl+Enter opretter sagen, Ctrl+D tilføjer en enhed, fra hvor som helst på siden.
  useEffect(() => {
    if (done) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void submit();
      } else if ((e.key === "d" || e.key === "D") && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault(); // Ctrl+D er "bogmærk" i browseren
        addDevice();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, submit, addDevice]);

  // Esc åbner den forrige sektion igen (felter der bruger Esc selv, markerer den som håndteret).
  function onRootKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Escape" || e.defaultPrevented || active.kind === "customer") return;
    e.preventDefault();
    const prev = previousSection(
      devices.map((d) => d.key),
      active,
    );
    if (prev === "customer") setActive({ kind: "customer" });
    else goDevice(prev.key, prev.section);
  }

  /* ----------------------------- visning --------------------------- */

  if (done?.kind === "single") {
    return <SuccessScreen result={done.result} request={done.request} autoPrint={print} onReset={onReset} />;
  }
  if (done?.kind === "group") {
    return <GroupSuccessScreen result={done.result} request={done.request} autoPrint={print} onReset={onReset} />;
  }

  const customerSummary = customerName ? `${customerName} · ${customerType === "erhverv" ? "Erhverv" : "Privat"} · ${formatPhoneDk(customerPhone)}` : null;
  const panelDevices: PanelDevice[] = devices.map((d, i) => ({
    key: d.key,
    name: d.model?.name ?? null,
    sub: d.fields.serial.trim() ? d.fields.serial.trim() : "IMEI mangler",
    lines: views[i].lines,
    total_oere: views[i].total_oere,
    depositHint: views[i].needsDeposit,
  }));

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
          open={active.kind === "customer"}
          onOpen={() => setActive({ kind: "customer" })}
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
            onConfirmDraft={() => goDevice(openKey, "device")}
            onClear={() => {
              setExisting(null);
              setDraft(EMPTY_CUSTOMER);
            }}
          />
        </SectionCard>

        {devices.map((d, i) => (
          <DeviceBlock
            key={d.key}
            draft={d}
            view={views[i]}
            index={i}
            count={devices.length}
            location={location}
            displayLocation={displayLocation}
            tree={tree}
            treeError={treeError}
            onRetryTree={() => setTreeTry((n) => n + 1)}
            customer={existing}
            now={now}
            expanded={!multi || d.key === openKey}
            activeSection={active.kind === "device" && active.key === d.key ? active.section : null}
            onGo={(section) => goDevice(d.key, section)}
            onExpand={() => expandDevice(d.key)}
            onRemove={() => removeDevice(d.key)}
            onPatch={patchDevice}
          />
        ))}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addDevice}
            disabled={devices.length >= MAX_DEVICES}
            className="h-10 rounded-lg border border-dashed border-[#1A3D2E] px-4 text-sm font-semibold text-[#1A3D2E] hover:bg-[#E7EFE9] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F8F55]"
          >
            + Tilføj enhed
          </button>
          <span className="text-xs text-[#5E6A63]">
            {multi ? `${devices.length} enheder, én sag hver, samlet beløb ${formatKr(total)}. ` : "Kunden har flere enheder med? "}Ctrl + D
          </span>
        </div>
      </main>

      <SummaryPanel
        customerName={customerName}
        customerSub={`${customerType === "erhverv" ? "Erhverv" : "Privat"} · ${formatPhoneDk(customerPhone)}`}
        devices={panelDevices}
        total_oere={total}
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

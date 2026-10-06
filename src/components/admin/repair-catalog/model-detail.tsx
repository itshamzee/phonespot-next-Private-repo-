"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DeviceImage } from "@/components/repair/device-image";
import type { BulkPriceOp } from "@/lib/repairs/catalog-manage-rules";
import type { ManageBrandNode, ManageModelResponse, ManageService } from "@/lib/repairs/catalog-manage-types";
import type { DeviceType } from "@/lib/supabase/types";
import { MANAGE, api, uploadImage } from "./api";
import { BulkBar } from "./bulk-bar";
import { ConfirmDialog } from "./confirm-dialog";
import { CopyDialog } from "./copy-dialog";
import { ServiceTable, type ServicePatch } from "./service-table";
import { StockDialog } from "./stock-dialog";
import { Badge, ErrorNote, btnPrimary, btnSecondary, btnSmall, inputCls, Switch } from "./ui";

const SITE = "https://phonespot.dk";

/** Én models detalje: hoved, handlinger, reparationer pr. kategori og kvalitet, lager og samlet prisændring. */
export function ModelDetail({
  modelId,
  brand,
  onChanged,
}: {
  modelId: string;
  /** Mærket modellen hører under (til serieforslag og kopiering). */
  brand: ManageBrandNode | null;
  /** Kaldes efter en ændring, så træets badges og tal opdateres. */
  onChanged: () => void;
}) {
  const [data, setData] = useState<ManageModelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | "model-on" | "model-off" | "activate-priced">(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [stockPart, setStockPart] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await api<ManageModelResponse>(`${MANAGE}/models/${modelId}`);
        setData(res);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [modelId],
  );

  useEffect(() => {
    setSelected(new Set());
    setNotice(null);
    setData(null);
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
    onChanged();
  }, [load, onChanged]);

  const services = useMemo(() => data?.categories.flatMap((c) => c.services) ?? [], [data]);
  const selectedServices: ManageService[] = useMemo(() => services.filter((s) => selected.has(s.id)), [services, selected]);

  async function patchService(id: string, patch: ServicePatch): Promise<boolean> {
    setError(null);
    setNotice(null);
    try {
      await api(`${MANAGE}/services/${id}`, { method: "PATCH", body: patch });
      await refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }

  async function patchModel(patch: Record<string, unknown>): Promise<boolean> {
    setError(null);
    setNotice(null);
    try {
      await api(`${MANAGE}/models/${modelId}`, { method: "PATCH", body: patch });
      await refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }

  async function bulk(body: Record<string, unknown>, done: (updated: number) => string) {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ updated: number }>(`${MANAGE}/services/bulk`, { body: { ...body, model_id: modelId } });
      setNotice(done(res.updated));
      setSelected(new Set());
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      await patchModel({ image_url: url });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (loading && !data) return <p className="rounded-xl border border-[#E2E5E0] bg-white px-6 py-12 text-center text-[14px] text-[#5E6A63]">Henter reparationer...</p>;
  if (!data) return error ? <ErrorNote>{error}</ErrorNote> : null;

  const { model, summary } = data;
  const pageUrl = `${SITE}/reparation/${model.brand_slug}/${model.slug}`;
  const existingSeries = brand?.series.map((s) => s.name).filter((n) => n !== "Øvrige") ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className="flex flex-col gap-4 rounded-xl border border-[#E2E5E0] bg-white p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-[#E2E5E0] bg-[#F5F6F4] p-1.5">
              <DeviceImage
                brandSlug={model.brand_slug}
                deviceType={(model.device_type as DeviceType) ?? "smartphone"}
                imageUrl={model.image_url}
                modelName={model.name}
                className="h-full w-full"
              />
            </div>
            <label className="cursor-pointer text-[13px] text-[#1A3D2E] underline">
              {uploading ? "Uploader..." : model.image_url ? "Skift billede" : "Tilføj billede"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
            </label>
          </div>

          <div className="min-w-[240px] flex-1">
            <p className="text-[13px] text-[#5E6A63]">{model.brand_name}</p>
            <h2 className="text-[26px] font-bold leading-tight tracking-[-0.02em]">{model.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[14px]">
              <label htmlFor="model-series" className="text-[#5E6A63]">
                Serie
              </label>
              <SeriesField value={model.series ?? ""} list={existingSeries} onSave={(v) => patchModel({ series: v })} />
            </div>
            <p className="mt-2 text-[13px] text-[#5E6A63]">
              {summary.live} af {summary.total} reparationer er aktive med pris
              {summary.priced_inactive > 0 && `, ${summary.priced_inactive} med pris er skjult`}.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[14px] font-semibold">Vises på hjemmesiden</p>
                <p className="text-[13px] text-[#5E6A63]">{model.active ? "Ja, modellen er live" : "Nej, modellen er skjult"}</p>
              </div>
              <Switch
                checked={model.active}
                label="Modellen vises på hjemmesiden"
                onChange={(next) => setConfirm(next ? "model-on" : "model-off")}
              />
            </div>
            {model.active && (
              <a href={pageUrl} target="_blank" rel="noreferrer" className="text-[13px] text-[#1A3D2E] underline">
                Åbn på hjemmesiden
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 border-t border-[#EEF0EC] pt-4">
          <button type="button" className={btnSecondary} onClick={() => setCopyOpen(true)}>
            Kopiér reparationer fra...
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={summary.priced_inactive === 0 || busy}
            onClick={() => setConfirm("activate-priced")}
            title={summary.priced_inactive === 0 ? "Ingen skjulte reparationer har en pris" : undefined}
          >
            Aktivér alle med pris{summary.priced_inactive > 0 ? ` (${summary.priced_inactive})` : ""}
          </button>
          {!model.active && summary.live === 0 && <Badge tone="amber">Ingen priser: vises hverken på hjemmesiden eller i Ny sag</Badge>}
        </div>
      </section>

      {error && <ErrorNote>{error}</ErrorNote>}
      {notice && (
        <p role="status" className="rounded-lg border border-[#BFD9C8] bg-[#E7EFE9] px-3 py-2 text-[13px] text-[#1A3D2E]">
          {notice}
        </p>
      )}
      {!model.active && summary.live > 0 && (
        <p className="rounded-lg border border-[#E2E5E0] bg-white px-3 py-2 text-[13px] text-[#3D4842]">
          Modellen er skjult. Aktive reparationer vises først på hjemmesiden og i Ny sag, når du har aktiveret modellen.
        </p>
      )}

      <ServiceTable
        categories={data.categories}
        selected={selected}
        onSelect={(ids, on) =>
          setSelected((cur) => {
            const next = new Set(cur);
            for (const id of ids) {
              if (on) next.add(id);
              else next.delete(id);
            }
            return next;
          })
        }
        onPatch={patchService}
        onStock={setStockPart}
        onError={setError}
      />

      {selectedServices.length > 0 && (
        <BulkBar
          selected={selectedServices}
          busy={busy}
          onClear={() => setSelected(new Set())}
          onApplyPrice={(op: BulkPriceOp) =>
            void bulk({ action: "price", ids: selectedServices.map((s) => s.id), op }, (n) => `${n} priser er opdateret.`)
          }
          onSetActive={(active) =>
            void bulk({ action: "set_active", ids: selectedServices.map((s) => s.id), active }, (n) =>
              active ? `${n} reparationer vises nu på hjemmesiden.` : `${n} reparationer er skjult.`,
            )
          }
        />
      )}

      <ConfirmDialog
        open={confirm === "model-on"}
        title={`Vis ${model.name} på hjemmesiden?`}
        confirmLabel="Vis på hjemmesiden"
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          setBusy(true);
          await patchModel({ active: true });
          setBusy(false);
          setConfirm(null);
        }}
      >
        <p>
          Modellen og dens {summary.live} aktive reparationer bliver synlige for kunderne på <strong>phonespot.dk</strong> med det samme, og modellen kan
          vælges i Ny sag.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "model-off"}
        title={`Skjul ${model.name}?`}
        confirmLabel="Skjul modellen"
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          setBusy(true);
          await patchModel({ active: false });
          setBusy(false);
          setConfirm(null);
        }}
      >
        <p>Kunderne kan ikke længere se eller bestille reparationer til modellen på hjemmesiden, og den forsvinder fra Ny sag. Priserne gemmes.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "activate-priced"}
        title={`Aktivér ${summary.priced_inactive} reparationer?`}
        confirmLabel="Aktivér alle med pris"
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => void bulk({ action: "activate_priced" }, (n) => `${n} reparationer vises nu på hjemmesiden.`)}
      >
        <p>
          Alle skjulte reparationer med pris over 0 kr. bliver <strong>aktive</strong>
          {model.active ? " og vises på hjemmesiden med det samme." : ", men vises først på hjemmesiden, når modellen er aktiveret."} Tjek priserne først.
        </p>
      </ConfirmDialog>

      {copyOpen && (
        <CopyDialog
          open
          target={{ id: model.id, name: model.name }}
          brand={brand}
          onClose={() => setCopyOpen(false)}
          onDone={(message) => {
            setNotice(message);
            void refresh();
          }}
        />
      )}

      <StockDialog
        partId={stockPart}
        onClose={() => setStockPart(null)}
        onChanged={(message) => {
          setNotice(message);
          void refresh();
        }}
      />
    </div>
  );
}

function SeriesField({ value, list, onSave }: { value: string; list: string[]; onSave: (v: string | null) => Promise<boolean> }) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // Ny værdi fra serveren: nulstil udkastet (under render, så der ikke kommer en ekstra runde).
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  const [saving, setSaving] = useState(false);
  const dirty = draft.trim() !== value.trim();
  return (
    <span className="flex items-center gap-2">
      <input
        id="model-series"
        list="model-series-list"
        className={`${inputCls} !h-8 !w-48`}
        value={draft}
        placeholder="Ingen serie"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      <datalist id="model-series-list">
        {list.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {dirty && (
        <button
          type="button"
          className={btnSmall}
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            const ok = await onSave(draft.trim() || null);
            setSaving(false);
            if (!ok) setDraft(value);
          }}
        >
          {saving ? "Gemmer..." : "Gem serie"}
        </button>
      )}
    </span>
  );
}

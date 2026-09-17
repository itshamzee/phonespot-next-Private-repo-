"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProductImageUploader } from "@/components/platform/product-image-uploader";
import { Button, Chip, Field, FieldRow, Input, Notice, Section, Segmented, Select } from "@/components/admin/ui";
import { slugify } from "@/lib/supabase/accessories";
import { GRADE_SHORT_LABEL } from "@/lib/grades";
import { getDeviceImageUrl } from "@/lib/device-images";
import { WebshopPreview, type ReadinessCheck } from "./webshop-preview";
import { parseKrToOere, formatOere } from "./money";
import { buildUnitPayloads, emptyUnitRow, unitRowError, type UnitRow } from "./device-units";

interface TemplateRow {
  id: string;
  brand: string;
  model: string;
  display_name: string;
  category: string;
  slug: string | null;
  status: "draft" | "published";
  storage_options: string[] | null;
  colors: string[] | null;
  images: string[] | null;
  new_price: number | null;
}

interface LocationRow { id: string; name: string; type: string }

const CATEGORIES = [
  { value: "iphone", label: "iPhone" },
  { value: "smartphone", label: "Smartphone" },
  { value: "ipad", label: "iPad" },
  { value: "tablet", label: "Tablet" },
  { value: "laptop", label: "Bærbar" },
  { value: "smartwatch", label: "Smartwatch" },
  { value: "console", label: "Konsol" },
];

const STORAGE_BY_CATEGORY: Record<string, string[]> = {
  iphone: ["64GB", "128GB", "256GB", "512GB", "1TB"],
  smartphone: ["64GB", "128GB", "256GB", "512GB", "1TB"],
  ipad: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"],
  tablet: ["32GB", "64GB", "128GB", "256GB", "512GB"],
  laptop: ["128GB", "256GB", "512GB", "1TB", "2TB"],
  smartwatch: ["8GB", "16GB", "32GB"],
  console: ["256GB", "512GB", "825GB", "1TB", "2TB"],
};

interface NewModel {
  brand: string;
  model: string;
  category: string;
  storage: string[];
  colors: string;
  newPrice: string;
  images: string[];
}

const emptyModel: NewModel = { brand: "Apple", model: "", category: "iphone", storage: [], colors: "", newPrice: "", images: [] };

export function DeviceForm() {
  const [modelMode, setModelMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TemplateRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [template, setTemplate] = useState<TemplateRow | null>(null);
  const [newModel, setNewModel] = useState<NewModel>(emptyModel);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [rows, setRows] = useState<UnitRow[]>([emptyUnitRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ count: number; slug: string | null; name: string } | null>(null);

  useEffect(() => {
    fetch("/api/platform/locations").then((r) => (r.ok ? r.json() : [])).then((data: LocationRow[]) => {
      if (!Array.isArray(data)) return;
      setLocations(data);
      const vejle = data.find((l) => l.name?.toLowerCase() === "vejle") ?? data.find((l) => l.type === "store");
      if (vejle) setRows((rs) => rs.map((r) => (r.locationId ? r : { ...r, locationId: vejle.id })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (modelMode !== "existing") return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/platform/templates?search=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, modelMode]);

  const displayName = useMemo(
    () => (modelMode === "existing" ? template?.display_name ?? "" : [newModel.brand, newModel.model].filter(Boolean).join(" ").trim()),
    [modelMode, template, newModel.brand, newModel.model],
  );
  const storageOptions = modelMode === "existing" ? template?.storage_options ?? [] : newModel.storage;
  const colorOptions = modelMode === "existing" ? template?.colors ?? [] : newModel.colors.split(",").map((c) => c.trim()).filter(Boolean);
  const image =
    modelMode === "existing"
      ? template?.images?.[0] ?? (template?.slug ? getDeviceImageUrl(template.slug) : null)
      : newModel.images[0] ?? getDeviceImageUrl(slugify(displayName));

  const unitErrors = rows.map(unitRowError);
  const validRows = rows.filter((_, i) => !unitErrors[i]);
  const unitCount = validRows.reduce((n, r) => n + (Number(r.count) || 0), 0);
  const minPrice = validRows.length ? Math.min(...validRows.map((r) => parseKrToOere(r.price) ?? Infinity)) : null;

  const checks: ReadinessCheck[] = [
    {
      label: "Model",
      ok: modelMode === "existing" ? !!template : newModel.model.trim().length > 1,
      fix: modelMode === "existing" ? "søg og vælg en model" : "skriv modellens navn",
    },
    { label: "Billede", ok: !!image, fix: "upload et modelfoto" },
    { label: "Mindst én enhed med priser og lagerplads", ok: unitCount > 0, fix: unitErrors.find(Boolean) ?? undefined },
  ];
  const ready = checks.every((c) => c.ok) && rows.every((_, i) => !unitErrors[i]);

  function updateRow(key: string, patch: Partial<UnitRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      let templateId = template?.id ?? null;
      let slug = template?.slug ?? null;
      if (modelMode === "new") {
        slug = slugify(displayName);
        const res = await fetch("/api/platform/templates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            brand: newModel.brand.trim(),
            model: newModel.model.trim(),
            display_name: displayName,
            category: newModel.category,
            slug,
            storage_options: newModel.storage,
            colors: colorOptions,
            new_price: parseKrToOere(newModel.newPrice),
            images: newModel.images,
            status: "published",
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data?.error ?? "Modellen blev ikke oprettet."); return; }
        templateId = data.id;
      } else if (template && template.status !== "published") {
        // En kladde-model bliver først synlig, når den er published.
        await fetch("/api/platform/templates", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items: [{ id: template.id, status: "published" }] }),
        });
      }
      if (!templateId) { setError("Vælg en model først."); return; }

      const payloads = buildUnitPayloads(templateId, rows);
      let done = 0;
      for (const payload of payloads) {
        const res = await fetch("/api/platform/devices/quick-add", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(`${done} af ${payloads.length} enheder blev oprettet. Fejl: ${data?.error ?? res.status}`);
          return;
        }
        done++;
      }
      setCreated({ count: done, slug, name: displayName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingen forbindelse. Prøv igen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-[640px]">
        <Notice tone="success" title={`${created.count} ${created.count === 1 ? "enhed" : "enheder"} oprettet på ${created.name}`}>
          De er på webshoppen nu og kan reserveres i kurven.
        </Notice>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => { setCreated(null); setRows([emptyUnitRow({ locationId: rows[0]?.locationId })]); }}>
            Tilføj flere enheder på samme model
          </Button>
          <Button onClick={() => { setCreated(null); setTemplate(null); setQuery(""); setNewModel(emptyModel); setRows([emptyUnitRow({ locationId: rows[0]?.locationId })]); }}>
            Ny model
          </Button>
          {created.slug && (
            <Link href={`/refurbished/${created.slug}`} target="_blank" className="inline-flex h-10 items-center px-3 text-[14px] text-green-eco hover:underline">
              Se på webshoppen
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,640px)_300px] lg:items-start">
      <form className="flex flex-col gap-8" onSubmit={(e) => { e.preventDefault(); if (ready) void submit(); }}>
        <Section title="Hvilken model?">
          <Segmented
            label="Model"
            value={modelMode}
            onChange={setModelMode}
            options={[{ value: "existing", label: "Findes allerede" }, { value: "new", label: "Ny model" }]}
          />
          {modelMode === "existing" ? (
            <div className="flex flex-col gap-2">
              {template ? (
                <div className="flex items-center justify-between rounded-lg border border-green-eco bg-green-pale px-4 py-3">
                  <div>
                    <p className="text-[14px] font-medium text-charcoal">{template.display_name}</p>
                    <p className="text-[13px] text-gray">
                      {template.status === "published" ? "På webshoppen" : "Kladde, bliver synlig når enheden oprettes"}
                      {template.storage_options?.length ? ` · ${template.storage_options.join(", ")}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="quiet" onClick={() => { setTemplate(null); setQuery(""); }}>Skift</Button>
                </div>
              ) : (
                <>
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søg model, fx iPhone 15 Pro" autoFocus />
                  {(results.length > 0 || searching) && (
                    <ul className="divide-y divide-sand rounded-lg border border-sand bg-white">
                      {searching && results.length === 0 && <li className="px-4 py-2 text-[13px] text-gray">Søger…</li>}
                      {results.map((t) => (
                        <li key={t.id}>
                          <button type="button" onClick={() => { setTemplate(t); setResults([]); }} className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-cream">
                            <span className="text-[14px] text-charcoal">{t.display_name}</span>
                            <span className="text-[12px] text-gray">{t.status === "published" ? "" : "Kladde"}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {query.trim().length >= 2 && !searching && results.length === 0 && (
                    <p className="text-[13px] text-gray">
                      Ingen model matcher. <button type="button" className="text-charcoal underline" onClick={() => { setModelMode("new"); setNewModel((m) => ({ ...m, model: query.trim() })); }}>Opret den som ny model</button>
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <Field label="Kategori">
                <Segmented label="Kategori" size="sm" value={newModel.category} onChange={(v) => setNewModel((m) => ({ ...m, category: v, storage: [] }))} options={CATEGORIES} />
              </Field>
              <FieldRow>
                <Field label="Mærke" required>
                  {(id) => <Input id={id} value={newModel.brand} onChange={(e) => setNewModel((m) => ({ ...m, brand: e.target.value }))} placeholder="Apple" />}
                </Field>
                <Field label="Model" required hint={displayName ? `Vises som “${displayName}”` : "Fx iPhone 15 Pro"}>
                  {(id) => <Input id={id} value={newModel.model} onChange={(e) => setNewModel((m) => ({ ...m, model: e.target.value }))} placeholder="iPhone 15 Pro" autoFocus />}
                </Field>
              </FieldRow>
              {(STORAGE_BY_CATEGORY[newModel.category] ?? []).length > 0 && (
                <Field label="Lagerpladser der findes for modellen">
                  <div className="flex flex-wrap gap-1.5">
                    {(STORAGE_BY_CATEGORY[newModel.category] ?? []).map((s) => (
                      <Chip key={s} selected={newModel.storage.includes(s)} onToggle={() => setNewModel((m) => ({ ...m, storage: m.storage.includes(s) ? m.storage.filter((x) => x !== s) : [...m.storage, s] }))}>{s}</Chip>
                    ))}
                  </div>
                </Field>
              )}
              <FieldRow>
                <Field label="Farver" hint="Adskil med komma.">
                  {(id) => <Input id={id} value={newModel.colors} onChange={(e) => setNewModel((m) => ({ ...m, colors: e.target.value }))} placeholder="Sort, Hvid, Blå" />}
                </Field>
                <Field label="Nypris" hint="Vises som “før”-pris. Kun hvis du kender den.">
                  {(id) => <Input id={id} inputMode="decimal" suffix="kr" value={newModel.newPrice} onChange={(e) => setNewModel((m) => ({ ...m, newPrice: e.target.value }))} />}
                </Field>
              </FieldRow>
              <Field label="Modelfoto" hint="Ét rent foto af modellen. Bruges på alle enheder af modellen.">
                <ProductImageUploader images={newModel.images} onChange={(images) => setNewModel((m) => ({ ...m, images }))} folder="devices" max={4} />
              </Field>
            </>
          )}
        </Section>

        <Section
          title="Enheder"
          description="Én række pr. kombination af stand, lagerplads, farve og pris. Sæt antal, hvis du har flere ens."
          aside={<Button size="sm" onClick={() => setRows((rs) => [...rs, emptyUnitRow({ locationId: rs[rs.length - 1]?.locationId, storage: rs[rs.length - 1]?.storage })])}>Tilføj række</Button>}
        >
          {rows.map((row, i) => (
            <div key={row.key} className="rounded-lg border border-sand bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <Segmented
                  label="Stand"
                  size="sm"
                  value={row.grade}
                  onChange={(v) => updateRow(row.key, { grade: v })}
                  options={(["A", "B", "C"] as const).map((g) => ({ value: g, label: `${g} · ${GRADE_SHORT_LABEL[g]}` }))}
                />
                {rows.length > 1 && (
                  <Button size="sm" variant="quiet" onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}>Fjern</Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Lagerplads">
                  {(id) =>
                    storageOptions.length ? (
                      <Select id={id} value={row.storage} onChange={(e) => updateRow(row.key, { storage: e.target.value })}>
                        <option value="">Vælg</option>
                        {storageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    ) : (
                      <Input id={id} value={row.storage} onChange={(e) => updateRow(row.key, { storage: e.target.value })} placeholder="128GB" />
                    )
                  }
                </Field>
                <Field label="Farve">
                  {(id) => (
                    <>
                      <Input id={id} list={`colors-${row.key}`} value={row.color} onChange={(e) => updateRow(row.key, { color: e.target.value })} placeholder="Sort" />
                      <datalist id={`colors-${row.key}`}>{colorOptions.map((c) => <option key={c} value={c} />)}</datalist>
                    </>
                  )}
                </Field>
                <Field label="Salgspris" required>
                  {(id) => <Input id={id} inputMode="decimal" suffix="kr" value={row.price} onChange={(e) => updateRow(row.key, { price: e.target.value })} />}
                </Field>
                <Field label="Indkøbspris" required>
                  {(id) => <Input id={id} inputMode="decimal" suffix="kr" value={row.purchasePrice} onChange={(e) => updateRow(row.key, { purchasePrice: e.target.value })} />}
                </Field>
                <Field label="Ligger i">
                  {(id) => (
                    <Select id={id} value={row.locationId} onChange={(e) => updateRow(row.key, { locationId: e.target.value })}>
                      <option value="">Vælg</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Antal">
                  {(id) => <Input id={id} inputMode="numeric" value={row.count} onChange={(e) => updateRow(row.key, { count: e.target.value.replace(/\D/g, "") })} />}
                </Field>
                <Field label="IMEI / serienr." hint={Number(row.count) > 1 ? "Kun ved én enhed" : undefined}>
                  {(id) => <Input id={id} value={row.imei} onChange={(e) => updateRow(row.key, { imei: e.target.value })} disabled={Number(row.count) > 1} />}
                </Field>
                <Field label="Batteri">
                  {(id) => <Input id={id} inputMode="numeric" suffix="%" value={row.batteryHealth} onChange={(e) => updateRow(row.key, { batteryHealth: e.target.value.replace(/\D/g, "") })} />}
                </Field>
              </div>
              {unitErrors[i] && (row.price || row.purchasePrice) && <p className="mt-2 text-[13px] text-[#B42318]">{unitErrors[i]}</p>}
            </div>
          ))}
        </Section>

        {error && <Notice tone="danger" title="Kunne ikke oprette">{error}</Notice>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" loading={submitting} disabled={!ready}>
            {unitCount > 1 ? `Opret ${unitCount} enheder` : "Opret enhed"}
          </Button>
          <span className="text-[13px] text-gray">Enheder kommer på webshoppen med det samme.</span>
        </div>
      </form>

      <div className="lg:sticky lg:top-4">
        <WebshopPreview
          data={{
            title: displayName || "Modellens navn",
            brand: modelMode === "existing" ? template?.brand : newModel.brand,
            price: minPrice && Number.isFinite(minPrice) ? minPrice : null,
            image,
            modelsLabel: unitCount ? `${unitCount} ${unitCount === 1 ? "enhed" : "enheder"} · fra ${formatOere(minPrice && Number.isFinite(minPrice) ? minPrice : 0)}` : undefined,
            status: "published",
            alwaysInStock: false,
            stockTotal: unitCount,
          }}
          checks={checks}
        />
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useSaveBar } from "@/components/admin/shell/save-bar";
import Link from "next/link";
import { ProductImageUploader } from "@/components/platform/product-image-uploader";
import { Button, Field, FieldRow, Input, Notice, Section, Segmented, Select, Textarea, Toggle } from "@/components/admin/ui";
import { ACCESSORY_SUBCATEGORIES, MODEL_SPECIFIC_SUBCATEGORIES, TYPE_ATTRIBUTES } from "@/lib/admin/products/attributes";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { ModelsPicker } from "./models-picker";
import { WebshopPreview, type ReadinessCheck } from "./webshop-preview";
import { SupplierImport, type SupplierImportResult } from "./supplier-import";
import { parseKrToOere } from "./money";
import type { SupplierProduct } from "@/lib/admin/products/supplier-paste";

/** EUR → DKK til kostpris-forslag. Ikke en valutakurs-tjeneste; personalet retter selv. */
const EUR_TO_DKK = 7.46;

const KNOWN_BRANDS = ["Swissten", "Rexus", "NovaNL", "Apple", "Samsung", "Celly", "Trusmi"];

interface Created {
  id: string;
  slug: string;
  title: string;
  url: string;
}

/** Det GET /api/admin/products/[id] svarer med. */
export interface EditableProduct {
  product: Record<string, unknown> & { id: string };
  stock: Record<string, number>;
  models: string[];
  url: string | null;
}

interface FormState {
  title: string;
  subcategory: string;
  brand: string;
  models: string[];
  mode: "per-model" | "universal";
  price: string;
  salePrice: string;
  costPrice: string;
  ean: string;
  images: string[];
  description: string;
  shortDescription: string;
  highlights: string[];
  /** Leverandørdata, hvis produktet er indsat derfra; bruges til dansk tekst. */
  supplier: SupplierProduct | null;
  attributes: Record<string, string>;
  alwaysInStock: boolean;
  online: string;
  vejle: string;
  slagelse: string;
  status: "published" | "draft";
  metaTitle: string;
  metaDescription: string;
}

const initial: FormState = {
  title: "",
  subcategory: "cover",
  brand: "",
  models: [],
  mode: "per-model",
  price: "",
  salePrice: "",
  costPrice: "",
  ean: "",
  images: [],
  description: "",
  shortDescription: "",
  highlights: [],
  supplier: null,
  attributes: {},
  alwaysInStock: false,
  online: "",
  vejle: "",
  slagelse: "",
  status: "published",
  metaTitle: "",
  metaDescription: "",
};

/** Øre → det der står i et prisfelt: 34900 → "349", 34950 → "349,50". */
function krInput(oere: unknown): string {
  if (typeof oere !== "number" || !Number.isFinite(oere) || oere <= 0) return "";
  return oere % 100 === 0 ? String(oere / 100) : (oere / 100).toFixed(2).replace(".", ",");
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function fromProduct({ product, stock, models }: EditableProduct): FormState {
  const subcategory = str(product.subcategory) || "other";
  const typed = new Set((TYPE_ATTRIBUTES[subcategory] ?? []).map((f) => f.key));
  const attributes = Object.fromEntries(
    Object.entries((product.attributes as Record<string, unknown> | null) ?? {})
      .filter(([k, v]) => typed.has(k) && v != null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  );
  const highlights = (product.specifications as { highlights?: unknown } | null)?.highlights;
  const qty = (n: number | undefined) => (n && n > 0 ? String(n) : "");
  return {
    ...initial,
    title: str(product.title),
    subcategory,
    brand: str(product.brand).trim(),
    models,
    mode: "universal",
    price: krInput(product.selling_price),
    salePrice: krInput(product.sale_price),
    costPrice: krInput(product.cost_price),
    ean: str(product.ean),
    images: Array.isArray(product.images) ? (product.images as unknown[]).filter((i): i is string => typeof i === "string") : [],
    description: str(product.description),
    shortDescription: str(product.short_description),
    highlights: Array.isArray(highlights) ? highlights.filter((h): h is string => typeof h === "string") : [],
    attributes,
    alwaysInStock: product.always_in_stock === true,
    online: qty(stock.online),
    vejle: qty(stock.vejle),
    slagelse: qty(stock.slagelse),
    status: product.status === "published" ? "published" : "draft",
    metaTitle: str(product.meta_title),
    metaDescription: str(product.meta_description),
  };
}

const labelBySlug = new Map(TILBEHOER_DEVICES.map((d) => [d.slug, d.label]));

/**
 * Én formular til både "Opret produkt" og redigering af et eksisterende
 * tilbehørsprodukt. Med `edit` gemmer den via gem-bjælken i toppen (PUT);
 * uden opretter den (POST) og kan lave ét produkt pr. valgt model.
 */
export function AccessoryForm({ edit }: { edit?: EditableProduct }) {
  const isEdit = Boolean(edit);
  const [baseline, setBaseline] = useState<FormState>(() => (edit ? fromProduct(edit) : initial));
  const [form, setForm] = useState<FormState>(baseline);
  const [publicUrl, setPublicUrl] = useState<string | null>(edit?.url ?? null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created[] | null>(null);
  const [generatingEan, setGeneratingEan] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const modelSpecific = MODEL_SPECIFIC_SUBCATEGORIES.has(form.subcategory);
  const price = parseKrToOere(form.price);
  const salePrice = parseKrToOere(form.salePrice);
  const perModel = !isEdit && form.mode === "per-model" && form.models.length > 0;
  const knownCategory = ACCESSORY_SUBCATEGORIES.some((c) => c.value === form.subcategory);
  const stockTotal = [form.online, form.vejle, form.slagelse].reduce((n, v) => n + (Number(v) || 0), 0);
  const attributeFields = TYPE_ATTRIBUTES[form.subcategory] ?? [];

  const previewTitle = useMemo(() => {
    const first = form.models[0];
    const label = first ? (labelBySlug.get(first) ?? first) : "";
    return form.title.replace(/\{model\}/gi, label).replace(/\s+/g, " ").trim();
  }, [form.title, form.models]);

  const checks: ReadinessCheck[] = [
    { label: "Navn", ok: form.title.trim().length > 2, fix: "skriv et navn" },
    { label: "Pris", ok: price != null && price > 0, fix: "angiv salgspris" },
    { label: "Billede", ok: form.images.length > 0, fix: "upload mindst ét" },
    {
      label: "Passer til",
      ok: !modelSpecific || form.models.length > 0,
      fix: "vælg mindst én model",
    },
    {
      label: "Kan købes",
      ok: form.alwaysInStock || stockTotal > 0,
      fix: "sæt lager eller markér som bestillingsvare",
    },
  ];
  const ready = checks.every((c) => c.ok);
  const rowCount = perModel ? form.models.length : 1;

  const [writing, setWriting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);

  function applySupplier({ product, suggestedTitle, images, failedImages }: SupplierImportResult) {
    const attributes = { ...product.guess.attributes };
    setForm((f) => ({
      ...f,
      supplier: product,
      title: suggestedTitle || product.title,
      brand: product.brand ?? f.brand,
      subcategory: product.guess.subcategory,
      attributes,
      models: product.modelSlugs.length ? product.modelSlugs : f.models,
      mode: product.modelSlugs.length > 1 ? "per-model" : f.mode,
      images: images.length ? images : f.images,
      description: product.description || f.description,
      highlights: product.benefits.slice(0, 5),
      costPrice: product.priceEur != null ? String(Math.round(product.priceEur * EUR_TO_DKK)) : f.costPrice,
      ean: f.ean,
    }));
    if (failedImages > 0) setError(`${failedImages} ${failedImages === 1 ? "billede" : "billeder"} kunne ikke hentes fra leverandøren. Upload dem selv nedenfor.`);
  }

  async function writeDanish() {
    setWriteError(null);
    setWriting(true);
    try {
      const res = await fetch("/api/admin/products/copywrite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.supplier?.title || form.title,
          brand: form.brand || null,
          subcategory: form.subcategory,
          models: form.models,
          specs: form.supplier?.specs ?? form.attributes,
          benefits: form.supplier?.benefits ?? form.highlights,
          description: form.supplier?.description ?? form.description,
          perModel: form.models.length > 0 && form.mode === "per-model",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setWriteError(data?.error ?? "Teksten kunne ikke skrives."); return; }
      setForm((f) => ({
        ...f,
        title: data.title || f.title,
        shortDescription: data.shortDescription || f.shortDescription,
        highlights: Array.isArray(data.highlights) && data.highlights.length ? data.highlights : f.highlights,
        description: data.description || f.description,
      }));
    } catch {
      setWriteError("Ingen forbindelse. Prøv igen.");
    } finally {
      setWriting(false);
    }
  }

  async function generateEan() {
    setGeneratingEan(true);
    try {
      const res = await fetch("/api/admin/accessories/generate-ean", { method: "POST" });
      const data = await res.json();
      if (data?.ean) set("ean", data.ean);
    } finally {
      setGeneratingEan(false);
    }
  }

  // Leverandørdata er kun et hjælpemiddel til tekst — det tæller ikke som en ændring.
  const dirty = isEdit && JSON.stringify({ ...form, supplier: null }) !== JSON.stringify({ ...baseline, supplier: null });
  const blocked = !form.title.trim()
    ? "Navn mangler"
    : !price
      ? "Salgspris mangler"
      : salePrice != null && salePrice >= price
        ? "Tilbudsprisen skal være lavere end salgsprisen"
        : null;

  async function save() {
    if (!edit || blocked) return;
    setError(null);
    setWarnings([]);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/products/${edit.product.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          subcategory: form.subcategory,
          brand: form.brand || null,
          models: form.models,
          sellingPrice: price,
          salePrice,
          costPrice: parseKrToOere(form.costPrice),
          ean: form.ean || null,
          images: form.images,
          description: form.description || null,
          shortDescription: form.shortDescription || null,
          highlights: form.highlights.filter((h) => h.trim()),
          attributes: form.attributes,
          alwaysInStock: form.alwaysInStock,
          status: form.status,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
          stock: form.alwaysInStock
            ? undefined
            : {
                online: Number(form.online) || 0,
                stores: { vejle: Number(form.vejle) || 0, slagelse: Number(form.slagelse) || 0 },
              },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Ændringerne blev ikke gemt. Prøv igen.");
        return;
      }
      setBaseline(form);
      setPublicUrl(data.url ?? null);
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setSavedAt(Date.now());
    } catch {
      setError("Ingen forbindelse. Tjek netværket og prøv igen.");
    } finally {
      setSubmitting(false);
    }
  }

  useSaveBar({
    dirty,
    saving: submitting,
    blocked: dirty ? blocked : null,
    onSave: () => void save(),
    onDiscard: () => {
      setForm(baseline);
      setError(null);
    },
  });

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "accessory",
          items: [
            {
              title: form.title,
              subcategory: form.subcategory,
              brand: form.brand || null,
              models: form.models,
              mode: form.models.length ? form.mode : "universal",
              sellingPrice: price,
              salePrice,
              costPrice: parseKrToOere(form.costPrice),
              ean: form.ean || null,
              images: form.images,
              description: form.description || null,
              shortDescription: form.shortDescription || null,
              highlights: form.highlights.filter((h) => h.trim()),
              attributes: form.attributes,
              alwaysInStock: form.alwaysInStock,
              status: form.status,
              stock: form.alwaysInStock
                ? undefined
                : {
                    online: Number(form.online) || 0,
                    stores: { vejle: Number(form.vejle) || 0, slagelse: Number(form.slagelse) || 0 },
                  },
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Produktet blev ikke oprettet. Prøv igen.");
        return;
      }
      setCreated(data.created);
    } catch {
      setError("Ingen forbindelse. Tjek netværket og prøv igen.");
    } finally {
      setSubmitting(false);
    }
  }

  function createAnother(keepSetup: boolean) {
    setCreated(null);
    setError(null);
    setForm(keepSetup
      ? { ...initial, subcategory: form.subcategory, brand: form.brand, models: form.models, mode: form.mode, attributes: {} }
      : initial);
    window.scrollTo({ top: 0 });
  }

  if (created) {
    return (
      <div className="max-w-[640px]">
        <Notice tone="success" title={created.length === 1 ? "Produktet er oprettet" : `${created.length} produkter er oprettet`}>
          {created.length === 1
            ? form.status === "published" ? "Det er synligt på webshoppen nu." : "Det er gemt som kladde og vises ikke på webshoppen endnu."
            : form.status === "published" ? "De er synlige på webshoppen nu." : "De er gemt som kladde og vises ikke på webshoppen endnu."}
        </Notice>
        <ul className="mt-4 divide-y divide-sand rounded-xl border border-sand bg-white">
          {created.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
              <span className="truncate text-charcoal">{c.title}</span>
              <Link href={c.url} target="_blank" className="shrink-0 text-green-eco underline-offset-2 hover:underline">
                Se på webshoppen
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => createAnother(true)}>Opret endnu et med samme opsætning</Button>
          <Button onClick={() => createAnother(false)}>Opret et nyt fra bunden</Button>
          <Link href="/admin/tilbehoer" className="inline-flex h-10 items-center px-3 text-[14px] text-gray hover:text-charcoal">
            Til tilbehørslisten
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,640px)_300px] lg:items-start">
      <form
        className="flex min-w-0 flex-col gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (isEdit) void save();
          else if (ready) void submit();
        }}
      >
        <SupplierImport onApply={applySupplier} />

        <Section title="Hvad er det?">
          {knownCategory ? (
            <Field label="Kategori">
              <Segmented
                label="Kategori"
                value={form.subcategory}
                onChange={(v) => setForm((f) => ({ ...f, subcategory: v, attributes: {}, mode: isEdit ? "universal" : MODEL_SPECIFIC_SUBCATEGORIES.has(v) ? "per-model" : "universal" }))}
                options={ACCESSORY_SUBCATEGORIES.map((c) => ({ value: c.value, label: c.label, hint: c.hint }))}
              />
            </Field>
          ) : (
            <p className="text-[13px] text-gray">Kategori: {form.subcategory}. Den styres et andet sted og ændres ikke her.</p>
          )}
          <FieldRow>
            <Field label="Mærke" hint="Fx Swissten, Rexus eller NovaNL.">
              {(id) => (
                <>
                  <Input id={id} list="accessory-brands" value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Mærke" />
                  <datalist id="accessory-brands">
                    {KNOWN_BRANDS.map((b) => <option key={b} value={b} />)}
                  </datalist>
                </>
              )}
            </Field>
            {attributeFields.map((f) => (
              <Field key={f.key} label={f.label}>
                {(id) =>
                  f.type === "select" ? (
                    <Select id={id} value={form.attributes[f.key] ?? ""} onChange={(e) => set("attributes", { ...form.attributes, [f.key]: e.target.value })}>
                      <option value="">Vælg</option>
                      {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </Select>
                  ) : (
                    <Input id={id} value={form.attributes[f.key] ?? ""} onChange={(e) => set("attributes", { ...form.attributes, [f.key]: e.target.value })} />
                  )
                }
              </Field>
            ))}
          </FieldRow>
          <Field
            label="Navn"
            required
            hint={
              perModel
                ? <>Skriv <code className="rounded bg-cream px-1">{"{model}"}</code>, hvor modellens navn skal stå. Første bliver: <span className="text-charcoal">{previewTitle || "…"}</span></>
                : isEdit
                  ? "Navnet kunden ser i webshoppen. Produktets link ændres ikke, når du omdøber."
                  : "Navnet kunden ser i webshoppen."
            }
          >
            {(id) => (
              <Input
                id={id}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={modelSpecific ? "Swissten Clear Cover {model}" : "Swissten USB-C kabel 2 m"}
                autoFocus={!isEdit}
              />
            )}
          </Field>
        </Section>

        <Section
          title="Passer til"
          description={isEdit ? "De modeller produktet passer til. Vises under titlen på produktsiden og styrer modelfilteret." : modelSpecific ? "Vælg de modeller produktet passer til. Der oprettes ét produkt pr. model." : "Valgfrit. Vælg modeller, hvis produktet skal findes via modelfilteret."}
        >
          <ModelsPicker selected={form.models} onChange={(models) => set("models", models)} />
          {!isEdit && form.models.length > 1 && (
            <Segmented
              label="Oprettelse"
              size="sm"
              value={form.mode}
              onChange={(v) => set("mode", v)}
              options={[
                { value: "per-model", label: `Ét produkt pr. model (${form.models.length})` },
                { value: "universal", label: "Ét produkt, der passer alle valgte" },
              ]}
            />
          )}
        </Section>

        <Section title="Pris">
          <FieldRow cols={3}>
            <Field label="Salgspris" required>
              {(id) => <Input id={id} inputMode="decimal" suffix="kr" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="199" />}
            </Field>
            <Field label="Tilbudspris" hint="Vises som nedsat pris.">
              {(id) => <Input id={id} inputMode="decimal" suffix="kr" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} />}
            </Field>
            <Field label="Kostpris" hint="Kun internt.">
              {(id) => <Input id={id} inputMode="decimal" suffix="kr" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} />}
            </Field>
          </FieldRow>
        </Section>

        <Section title="Billeder" description="Første billede bruges i produktgrid og Google Shopping. Brug et rent produktfoto på lys baggrund.">
          <ProductImageUploader images={form.images} onChange={(images) => set("images", images)} folder={edit ? `sku/${edit.product.id}` : "accessories"} max={edit ? 8 : 6} />
        </Section>

        <Section title="Lager">
          <Toggle
            checked={form.alwaysInStock}
            onChange={(v) => set("alwaysInStock", v)}
            label="Bestillingsvare"
            description="Kan altid købes; vi bestiller hjem ved ordre. Kræver ikke lagertal."
          />
          {!form.alwaysInStock && (
            <FieldRow cols={3}>
              <Field label="Online" hint="Webshop-lager">
                {(id) => <Input id={id} inputMode="numeric" value={form.online} onChange={(e) => set("online", e.target.value)} placeholder="0" />}
              </Field>
              <Field label="Vejle">
                {(id) => <Input id={id} inputMode="numeric" value={form.vejle} onChange={(e) => set("vejle", e.target.value)} placeholder="0" />}
              </Field>
              <Field label="Slagelse">
                {(id) => <Input id={id} inputMode="numeric" value={form.slagelse} onChange={(e) => set("slagelse", e.target.value)} placeholder="0" />}
              </Field>
            </FieldRow>
          )}
          {perModel && !form.alwaysInStock && stockTotal > 0 && (
            <p className="text-[13px] text-gray">Lagertallene gælder for hvert af de {form.models.length} produkter.</p>
          )}
        </Section>

        <Section title="Detaljer" description={isEdit ? "Tekst og stregkode. Salgsargumenterne vises som funktionsliste på produktsiden." : "Valgfrit. Kan udfyldes senere."}>
          <Field label="Stregkode (EAN)" hint="Scan stregkoden, eller lad os lave en, hvis varen ingen har.">
            {(id) => (
              <div className="flex gap-2">
                <Input id={id} inputMode="numeric" value={form.ean} onChange={(e) => set("ean", e.target.value.replace(/\D/g, ""))} placeholder="5701234567890" />
                <Button onClick={generateEan} loading={generatingEan} className="shrink-0">Lav en</Button>
              </div>
            )}
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-cream px-3 py-2">
            <p className="text-[13px] text-charcoal">
              <span className="font-medium">Dansk tekst.</span>{" "}
              <span className="text-gray">Skriver titel, én linje, salgsargumenter og beskrivelse ud fra det, der er udfyldt{form.supplier ? " og leverandørens data" : ""}. Du retter bagefter.</span>
            </p>
            <Button size="sm" loading={writing} disabled={!form.title.trim() && !form.supplier} onClick={writeDanish}>Skriv dansk tekst</Button>
          </div>
          {writeError && <Notice tone="danger">{writeError}</Notice>}
          <Field label="Én linje under titlen" hint="Vises i grid og øverst på produktsiden. Højst ca. 110 tegn.">
            {(id) => <Input id={id} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} placeholder="Aftagelig pung med magnet, plads til tre kort" />}
          </Field>
          <Field label="Salgsargumenter" hint="Én pr. linje, 3–5 stk. Vises som liste på produktsiden. Skriv evt. “Overskrift: forklaring” for at få en uddybende tekst under hvert punkt.">
            {(id) => (
              <Textarea
                id={id}
                rows={Math.max(4, form.highlights.length + 1)}
                value={form.highlights.join("\n")}
                onChange={(e) => set("highlights", e.target.value.split("\n"))}
                placeholder={"Pungen kan tages af med et træk\nKompatibel med MagSafe\nPlads til tre kort og sedler"}
              />
            )}
          </Field>
          <Field label="Beskrivelse">
            {(id) => <Textarea id={id} rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Kort beskrivelse til produktsiden" />}
          </Field>
        </Section>

        {isEdit && (
          <Section title="Google" description="Sådan vises produktet i søgeresultater. Tomme felter udfyldes automatisk ud fra navn og tekst.">
            <div className="rounded-lg border border-sand bg-white px-4 py-3">
              <p className="truncate text-[12px] text-gray">phonespot.dk{publicUrl ?? "/tilbehoer/…"}</p>
              <p className="mt-0.5 line-clamp-1 text-[17px] leading-snug text-[#1a0dab]">{form.metaTitle.trim() || `${form.title.trim() || "Produktets navn"} | PhoneSpot`}</p>
              <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-gray">
                {form.metaDescription.trim() || form.shortDescription.trim() || "Beskrivelsen dannes automatisk ud fra produktets navn, mærke og modeller."}
              </p>
            </div>
            <Field label="Sidetitel" hint={`${form.metaTitle.length} af ca. 60 tegn.`}>
              {(id) => <Input id={id} value={form.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} placeholder={`${form.title.trim()} | PhoneSpot`} />}
            </Field>
            <Field label="Beskrivelse til Google" hint={`${form.metaDescription.length} af ca. 155 tegn.`}>
              {(id) => <Textarea id={id} rows={3} value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} />}
            </Field>
          </Section>
        )}

        {error && <Notice tone="danger" title={isEdit ? "Kunne ikke gemme" : "Kunne ikke oprette"}>{error}</Notice>}
        {warnings.map((w) => <Notice key={w} tone="danger">{w}</Notice>)}

        {!isEdit && (
          <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-sand bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:m-0 lg:border-0 lg:bg-transparent lg:p-0">
            <Button type="submit" variant="primary" loading={submitting} disabled={!ready}>
              {rowCount > 1 ? `Opret ${rowCount} produkter` : "Opret produkt"}
            </Button>
          </div>
        )}
      </form>

      <div className="flex flex-col gap-4 lg:sticky lg:top-0">
        <div className="rounded-xl border border-sand bg-white p-4">
          <p className="mb-2 text-[14px] font-semibold text-charcoal">Status</p>
          <Segmented
            label="Status"
            size="sm"
            value={form.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "published", label: "På webshoppen" },
              { value: "draft", label: "Kladde" },
            ]}
          />
          <p className="mt-2 text-[13px] text-gray">
            {form.status === "published" ? "Kunder kan se og købe produktet." : "Skjult for kunder, indtil du sætter det på webshoppen."}
          </p>
          {isEdit && publicUrl && !dirty && (
            <Link href={publicUrl} target="_blank" className="mt-2 inline-block text-[13px] font-medium text-green-eco underline-offset-2 hover:underline">
              Se på webshoppen
            </Link>
          )}
          {isEdit && savedAt && !dirty && <p role="status" className="mt-2 text-[13px] font-medium text-green-eco">Gemt</p>}
        </div>
        <WebshopPreview
          data={{
            title: previewTitle,
            brand: form.brand,
            price,
            salePrice,
            image: form.images[0] ?? null,
            modelsLabel: form.models.length === 1 ? labelBySlug.get(form.models[0]) : perModel ? `+ ${form.models.length - 1} andre modeller` : form.models.length ? `Passer til ${form.models.length} modeller` : undefined,
            status: form.status,
            alwaysInStock: form.alwaysInStock,
            stockTotal,
          }}
          checks={checks}
        />
      </div>
    </div>
  );
}

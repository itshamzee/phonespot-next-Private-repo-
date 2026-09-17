"use client";

import { useMemo, useState } from "react";
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
};

const labelBySlug = new Map(TILBEHOER_DEVICES.map((d) => [d.slug, d.label]));

export function AccessoryForm() {
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created[] | null>(null);
  const [generatingEan, setGeneratingEan] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const modelSpecific = MODEL_SPECIFIC_SUBCATEGORIES.has(form.subcategory);
  const price = parseKrToOere(form.price);
  const salePrice = parseKrToOere(form.salePrice);
  const perModel = form.mode === "per-model" && form.models.length > 0;
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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,640px)_300px] lg:items-start">
      <form
        className="flex flex-col gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) void submit();
        }}
      >
        <SupplierImport onApply={applySupplier} />

        <Section title="Hvad er det?">
          <Field label="Kategori">
            <Segmented
              label="Kategori"
              value={form.subcategory}
              onChange={(v) => setForm((f) => ({ ...f, subcategory: v, attributes: {}, mode: MODEL_SPECIFIC_SUBCATEGORIES.has(v) ? "per-model" : "universal" }))}
              options={ACCESSORY_SUBCATEGORIES.map((c) => ({ value: c.value, label: c.label, hint: c.hint }))}
            />
          </Field>
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
                : "Navnet kunden ser i webshoppen."
            }
          >
            {(id) => (
              <Input
                id={id}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={modelSpecific ? "Swissten Clear Cover {model}" : "Swissten USB-C kabel 2 m"}
                autoFocus
              />
            )}
          </Field>
        </Section>

        <Section
          title="Passer til"
          description={modelSpecific ? "Vælg de modeller produktet passer til. Der oprettes ét produkt pr. model." : "Valgfrit. Vælg modeller, hvis produktet skal findes via modelfilteret."}
        >
          <ModelsPicker selected={form.models} onChange={(models) => set("models", models)} />
          {form.models.length > 1 && (
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
          <ProductImageUploader images={form.images} onChange={(images) => set("images", images)} folder="accessories" max={6} />
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

        <Section title="Detaljer" description="Valgfrit. Kan udfyldes senere.">
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
          <Field label="Salgsargumenter" hint="Én pr. linje, 3–5 stk. Vises som liste på produktsiden.">
            {(id) => (
              <Textarea
                id={id}
                rows={4}
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

        {error && <Notice tone="danger" title="Kunne ikke oprette">{error}</Notice>}

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-sand bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:m-0 lg:border-0 lg:bg-transparent lg:p-0">
          <Button type="submit" variant="primary" loading={submitting} disabled={!ready}>
            {rowCount > 1 ? `Opret ${rowCount} produkter` : "Opret produkt"}
          </Button>
          <Segmented
            label="Status"
            size="sm"
            value={form.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "published", label: "Vis på webshoppen" },
              { value: "draft", label: "Gem som kladde" },
            ]}
          />
        </div>
      </form>

      <div className="lg:sticky lg:top-4">
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

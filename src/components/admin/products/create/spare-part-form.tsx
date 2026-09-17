"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductImageUploader } from "@/components/platform/product-image-uploader";
import { Button, Field, FieldRow, Input, Notice, Section, Segmented, Select, Textarea, Toggle } from "@/components/admin/ui";
import { WebshopPreview, type ReadinessCheck } from "./webshop-preview";
import { parseKrToOere } from "./money";

interface Option { id: string; name: string; default_warranty_months?: number | null }

interface FormState {
  title: string;
  partCategoryId: string;
  qualityTierId: string;
  deviceBrand: string;
  deviceSeries: string;
  deviceModel: string;
  price: string;
  salePrice: string;
  costPrice: string;
  warrantyMonths: string;
  ean: string;
  images: string[];
  description: string;
  isInquiryOnly: boolean;
  alwaysInStock: boolean;
  online: string;
  vejle: string;
  slagelse: string;
  status: "published" | "draft";
}

const initial: FormState = {
  title: "", partCategoryId: "", qualityTierId: "", deviceBrand: "Apple", deviceSeries: "", deviceModel: "",
  price: "", salePrice: "", costPrice: "", warrantyMonths: "", ean: "", images: [], description: "",
  isInquiryOnly: false, alwaysInStock: false, online: "", vejle: "", slagelse: "", status: "published",
};

export function SparePartForm() {
  const [form, setForm] = useState<FormState>(initial);
  const [categories, setCategories] = useState<Option[]>([]);
  const [tiers, setTiers] = useState<Option[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; title: string; url: string }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/admin/spare-parts/categories").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/spare-parts/quality-tiers").then((r) => (r.ok ? r.json() : [])),
    ]).then(([c, t]) => {
      if (cancelled) return;
      setCategories(Array.isArray(c) ? c : []);
      setTiers(Array.isArray(t) ? t : []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const price = parseKrToOere(form.price);
  const salePrice = parseKrToOere(form.salePrice);
  const stockTotal = [form.online, form.vejle, form.slagelse].reduce((n, v) => n + (Number(v) || 0), 0);

  const checks: ReadinessCheck[] = [
    { label: "Navn", ok: form.title.trim().length > 2, fix: "skriv et navn" },
    { label: "Pris", ok: price != null && price > 0, fix: "angiv salgspris" },
    { label: "Kategori", ok: !!form.partCategoryId, fix: "vælg reservedelstype" },
    { label: "Enhed", ok: form.deviceModel.trim().length > 0, fix: "skriv hvilken model den passer til" },
    { label: "Billede", ok: form.images.length > 0, fix: "upload mindst ét" },
    { label: "Kan købes", ok: form.isInquiryOnly || form.alwaysInStock || stockTotal > 0, fix: "sæt lager, bestillingsvare eller kun forespørgsel" },
  ];
  const ready = checks.every((c) => c.ok);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "spare-part",
          items: [{
            title: form.title,
            sellingPrice: price,
            salePrice,
            costPrice: parseKrToOere(form.costPrice),
            partCategoryId: form.partCategoryId || null,
            qualityTierId: form.qualityTierId || null,
            warrantyMonths: form.warrantyMonths ? Number(form.warrantyMonths) : null,
            deviceBrand: form.deviceBrand || null,
            deviceSeries: form.deviceSeries || null,
            deviceModel: form.deviceModel || null,
            ean: form.ean || null,
            images: form.images,
            description: form.description || null,
            isInquiryOnly: form.isInquiryOnly,
            alwaysInStock: form.alwaysInStock,
            status: form.status,
            stock: form.alwaysInStock ? undefined : {
              online: Number(form.online) || 0,
              stores: { vejle: Number(form.vejle) || 0, slagelse: Number(form.slagelse) || 0 },
            },
          }],
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? "Reservedelen blev ikke oprettet. Prøv igen."); return; }
      setCreated(data.created);
    } catch {
      setError("Ingen forbindelse. Tjek netværket og prøv igen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-[640px]">
        <Notice tone="success" title="Reservedelen er oprettet">
          {form.status === "published" ? "Den er synlig på webshoppen nu." : "Den er gemt som kladde."}
        </Notice>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => { setCreated(null); setForm({ ...initial, partCategoryId: form.partCategoryId, qualityTierId: form.qualityTierId, deviceBrand: form.deviceBrand, deviceSeries: form.deviceSeries }); }}>
            Opret endnu en med samme opsætning
          </Button>
          <Button onClick={() => { setCreated(null); setForm(initial); }}>Opret en ny fra bunden</Button>
          <Link href="/admin/reservedele" className="inline-flex h-10 items-center px-3 text-[14px] text-gray hover:text-charcoal">Til reservedelslisten</Link>
        </div>
      </div>
    );
  }

  const categoryLabel = categories.find((c) => c.id === form.partCategoryId)?.name;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,640px)_300px] lg:items-start">
      <form className="flex flex-col gap-8" onSubmit={(e) => { e.preventDefault(); if (ready) void submit(); }}>
        <Section title="Hvad er det?">
          <FieldRow>
            <Field label="Reservedelstype" required>
              {(id) => (
                <Select id={id} value={form.partCategoryId} onChange={(e) => set("partCategoryId", e.target.value)}>
                  <option value="">Vælg</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Kvalitet" hint="Fx original, OEM eller kompatibel.">
              {(id) => (
                <Select id={id} value={form.qualityTierId} onChange={(e) => set("qualityTierId", e.target.value)}>
                  <option value="">Vælg</option>
                  {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              )}
            </Field>
          </FieldRow>
          <Field label="Navn" required hint="Fx “iPhone 13 skærm, OEM”.">
            {(id) => <Input id={id} value={form.title} onChange={(e) => set("title", e.target.value)} autoFocus />}
          </Field>
        </Section>

        <Section title="Passer til" description="Bruges til webadressen og til at finde delen under den rigtige enhed.">
          <FieldRow cols={3}>
            <Field label="Mærke" required>
              {(id) => <Input id={id} value={form.deviceBrand} onChange={(e) => set("deviceBrand", e.target.value)} placeholder="Apple" />}
            </Field>
            <Field label="Serie" hint="Fx iPhone eller Galaxy S.">
              {(id) => <Input id={id} value={form.deviceSeries} onChange={(e) => set("deviceSeries", e.target.value)} placeholder="iPhone" />}
            </Field>
            <Field label="Model" required>
              {(id) => <Input id={id} value={form.deviceModel} onChange={(e) => set("deviceModel", e.target.value)} placeholder="iPhone 13" />}
            </Field>
          </FieldRow>
        </Section>

        <Section title="Pris og garanti">
          <FieldRow cols={3}>
            <Field label="Salgspris" required>
              {(id) => <Input id={id} inputMode="decimal" suffix="kr" value={form.price} onChange={(e) => set("price", e.target.value)} />}
            </Field>
            <Field label="Tilbudspris">
              {(id) => <Input id={id} inputMode="decimal" suffix="kr" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} />}
            </Field>
            <Field label="Kostpris" hint="Kun internt.">
              {(id) => <Input id={id} inputMode="decimal" suffix="kr" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} />}
            </Field>
          </FieldRow>
          <Field label="Garanti" hint="Tom = kategoriens eller kvalitetens standard.">
            {(id) => <Input id={id} inputMode="numeric" suffix="mdr." value={form.warrantyMonths} onChange={(e) => set("warrantyMonths", e.target.value.replace(/\D/g, ""))} className="max-w-[160px]" />}
          </Field>
        </Section>

        <Section title="Billeder">
          <ProductImageUploader images={form.images} onChange={(images) => set("images", images)} folder="spare-parts" max={6} />
        </Section>

        <Section title="Lager og salg">
          <Toggle checked={form.isInquiryOnly} onChange={(v) => set("isInquiryOnly", v)} label="Kun forespørgsel" description="Kunden kan ikke lægge i kurv, men sende en forespørgsel." />
          <Toggle checked={form.alwaysInStock} onChange={(v) => set("alwaysInStock", v)} label="Bestillingsvare" description="Kan altid købes; vi bestiller hjem ved ordre." disabled={form.isInquiryOnly} />
          {!form.alwaysInStock && !form.isInquiryOnly && (
            <FieldRow cols={3}>
              <Field label="Online">{(id) => <Input id={id} inputMode="numeric" value={form.online} onChange={(e) => set("online", e.target.value)} placeholder="0" />}</Field>
              <Field label="Vejle">{(id) => <Input id={id} inputMode="numeric" value={form.vejle} onChange={(e) => set("vejle", e.target.value)} placeholder="0" />}</Field>
              <Field label="Slagelse">{(id) => <Input id={id} inputMode="numeric" value={form.slagelse} onChange={(e) => set("slagelse", e.target.value)} placeholder="0" />}</Field>
            </FieldRow>
          )}
        </Section>

        <Section title="Detaljer" description="Valgfrit.">
          <Field label="Stregkode (EAN)">
            {(id) => <Input id={id} inputMode="numeric" value={form.ean} onChange={(e) => set("ean", e.target.value.replace(/\D/g, ""))} />}
          </Field>
          <Field label="Beskrivelse">
            {(id) => <Textarea id={id} value={form.description} onChange={(e) => set("description", e.target.value)} />}
          </Field>
        </Section>

        {error && <Notice tone="danger" title="Kunne ikke oprette">{error}</Notice>}

        <p className="text-[13px] text-gray">
          Farvevarianter, specifikationer og B2B-pris kan tilføjes bagefter på reservedelens side, eller i{" "}
          <Link href="/admin/reservedele/opret" className="text-charcoal underline underline-offset-2">den udvidede formular</Link>.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" loading={submitting} disabled={!ready}>Opret reservedel</Button>
          <Segmented label="Status" size="sm" value={form.status} onChange={(v) => set("status", v)} options={[{ value: "published", label: "Vis på webshoppen" }, { value: "draft", label: "Gem som kladde" }]} />
        </div>
      </form>

      <div className="lg:sticky lg:top-4">
        <WebshopPreview
          data={{
            title: form.title,
            brand: categoryLabel,
            price,
            salePrice,
            image: form.images[0] ?? null,
            modelsLabel: [form.deviceBrand, form.deviceModel].filter(Boolean).join(" "),
            status: form.status,
            alwaysInStock: form.alwaysInStock || form.isInquiryOnly,
            stockTotal,
          }}
          checks={checks}
        />
      </div>
    </div>
  );
}

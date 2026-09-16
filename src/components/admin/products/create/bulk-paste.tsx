"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Field, Notice, Section, Segmented, Select, Textarea } from "@/components/admin/ui";
import { ACCESSORY_SUBCATEGORIES } from "@/lib/admin/products/attributes";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { parseKrToOere, formatOere } from "./money";

/**
 * Indsæt rækker fra et regneark (Excel/Sheets kopierer som tab-separeret tekst).
 * Kolonner: Navn · Mærke · Modeller · Pris · Kostpris · EAN · Billed-URL · Online-lager
 * Modeller kan skrives som labels ("iPhone 17 Pro, iPhone 17") eller slugs, adskilt af komma.
 */

interface ParsedRow {
  line: number;
  title: string;
  brand: string;
  models: string[];
  unknownModels: string[];
  price: number | null;
  costPrice: number | null;
  ean: string;
  image: string;
  online: number;
  error: string | null;
}

const COLUMNS = ["Navn", "Mærke", "Modeller", "Pris", "Kostpris", "EAN", "Billed-URL", "Online-lager"];

const byLabel = new Map(TILBEHOER_DEVICES.map((d) => [d.label.toLowerCase(), d.slug]));
const slugs = new Set(TILBEHOER_DEVICES.map((d) => d.slug));

function resolveModel(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (slugs.has(v)) return v;
  const bySlugified = v.toLowerCase().replace(/\s+/g, "-");
  if (slugs.has(bySlugified)) return bySlugified;
  return byLabel.get(v.toLowerCase()) ?? null;
}

export function parseRows(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
  const rows: ParsedRow[] = [];
  lines.forEach((line, index) => {
    const cells = line.split("\t").map((c) => c.trim());
    if (index === 0 && cells[0]?.toLowerCase() === "navn") return; // overskriftsrække
    const [title = "", brand = "", modelsRaw = "", priceRaw = "", costRaw = "", ean = "", image = "", onlineRaw = ""] = cells;
    const models: string[] = [];
    const unknownModels: string[] = [];
    for (const m of modelsRaw.split(/[,;]/)) {
      const t = m.trim();
      if (!t) continue;
      const slug = resolveModel(t);
      (slug ? models : unknownModels).push(slug ?? t);
    }
    const price = parseKrToOere(priceRaw);
    let error: string | null = null;
    if (!title) error = "Navn mangler";
    else if (price == null || price <= 0) error = "Pris mangler eller er ugyldig";
    else if (unknownModels.length) error = `Ukendt model: ${unknownModels.join(", ")}`;
    rows.push({
      line: index + 1, title, brand, models, unknownModels, price,
      costPrice: parseKrToOere(costRaw), ean: ean.replace(/\D/g, ""), image, online: Number(onlineRaw) || 0, error,
    });
  });
  return rows;
}

export function BulkPaste() {
  const [text, setText] = useState("");
  const [subcategory, setSubcategory] = useState("cover");
  const [mode, setMode] = useState<"per-model" | "universal">("per-model");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; title: string; url: string }[] | null>(null);

  const rows = useMemo(() => parseRows(text), [text]);
  const valid = rows.filter((r) => !r.error);
  const invalid = rows.filter((r) => r.error);
  const productCount = valid.reduce((n, r) => n + (mode === "per-model" && r.models.length ? r.models.length : 1), 0);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "accessory",
          items: valid.map((r) => ({
            title: r.title,
            subcategory,
            brand: r.brand || null,
            models: r.models,
            mode: r.models.length ? mode : "universal",
            sellingPrice: r.price,
            costPrice: r.costPrice,
            ean: r.ean || null,
            images: r.image ? [r.image] : [],
            status,
            alwaysInStock: r.online === 0,
            stock: r.online > 0 ? { online: r.online } : undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? "Produkterne blev ikke oprettet."); return; }
      setCreated(data.created);
    } catch {
      setError("Ingen forbindelse. Tjek netværket og prøv igen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-[720px]">
        <Notice tone="success" title={`${created.length} produkter er oprettet`}>
          {status === "published" ? "De er synlige på webshoppen nu. Produkter uden billede mangler stadig et foto." : "De er gemt som kladde."}
        </Notice>
        <ul className="mt-4 max-h-[420px] divide-y divide-sand overflow-y-auto rounded-xl border border-sand bg-white">
          {created.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2 text-[14px]">
              <span className="truncate">{c.title}</span>
              <Link href={c.url} target="_blank" className="shrink-0 text-green-eco hover:underline">Se</Link>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex gap-2">
          <Button variant="primary" onClick={() => { setCreated(null); setText(""); }}>Indsæt flere</Button>
          <Link href="/admin/tilbehoer" className="inline-flex h-10 items-center px-3 text-[14px] text-gray hover:text-charcoal">Til tilbehørslisten</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-[960px] flex-col gap-8">
      <Section
        title="Indsæt fra regneark"
        description={
          <>
            Kopiér rækker fra Excel eller Sheets med kolonnerne i denne rækkefølge: <span className="text-charcoal">{COLUMNS.join(" · ")}</span>.
            Modeller adskilles med komma og må skrives som på webshoppen, fx “iPhone 17 Pro, iPhone 17”. Tom online-lager = bestillingsvare.
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kategori for alle rækker">
            {(id) => (
              <Select id={id} value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                {ACCESSORY_SUBCATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Når en række har flere modeller">
            <Segmented label="Oprettelse" size="sm" value={mode} onChange={setMode} options={[{ value: "per-model", label: "Ét produkt pr. model" }, { value: "universal", label: "Ét produkt til alle" }]} />
          </Field>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"Swissten Clear Cover {model}\tSwissten\tiPhone 17 Pro, iPhone 17\t199\t60\t\thttps://…/cover.jpg\t10"}
          className="font-mono !text-[13px]"
        />
      </Section>

      {rows.length > 0 && (
        <Section title={`${rows.length} rækker læst`} description={invalid.length ? `${invalid.length} med fejl oprettes ikke.` : "Alle rækker kan oprettes."}>
          <div className="overflow-x-auto rounded-xl border border-sand">
            <table className="w-full text-[13px]">
              <thead className="bg-cream text-left text-gray">
                <tr>
                  <th className="px-3 py-2 font-medium">Navn</th>
                  <th className="px-3 py-2 font-medium">Mærke</th>
                  <th className="px-3 py-2 font-medium">Modeller</th>
                  <th className="px-3 py-2 text-right font-medium">Pris</th>
                  <th className="px-3 py-2 text-right font-medium">Lager</th>
                  <th className="px-3 py-2 font-medium">Billede</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand bg-white">
                {rows.map((r) => (
                  <tr key={r.line} className={r.error ? "bg-[#FDECEC]/50" : ""}>
                    <td className="px-3 py-2 text-charcoal">{r.title || <span className="text-gray">–</span>}</td>
                    <td className="px-3 py-2">{r.brand}</td>
                    <td className="px-3 py-2">{r.models.length ? `${r.models.length} valgt` : "–"}{r.unknownModels.length ? <span className="text-[#B42318]"> ({r.unknownModels.join(", ")})</span> : null}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatOere(r.price)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.online || "Bestilling"}</td>
                    <td className="px-3 py-2">{r.image ? "Ja" : <span className="text-gray">Nej</span>}</td>
                    <td className="px-3 py-2">{r.error ? <span className="text-[#B42318]">{r.error}</span> : <span className="text-green-eco">Klar</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <Notice tone="danger" title="Kunne ikke oprette">{error}</Notice>}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" loading={submitting} disabled={!valid.length} onClick={submit}>
              Opret {productCount} {productCount === 1 ? "produkt" : "produkter"}
            </Button>
            <Segmented label="Status" size="sm" value={status} onChange={setStatus} options={[{ value: "published", label: "Vis på webshoppen" }, { value: "draft", label: "Gem som kladde" }]} />
          </div>
        </Section>
      )}
    </div>
  );
}

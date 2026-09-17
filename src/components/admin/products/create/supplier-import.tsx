"use client";

import { useState, type ClipboardEvent } from "react";
import { Button, Notice, Textarea } from "@/components/admin/ui";
import { parseSupplierPaste, suggestTitle, type SupplierProduct } from "@/lib/admin/products/supplier-paste";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";

const labelBySlug = new Map(TILBEHOER_DEVICES.map((d) => [d.slug, d.label]));

export interface SupplierImportResult {
  product: SupplierProduct;
  suggestedTitle: string;
  /** Vores egne URL'er efter import; tom hvis billeder ikke kunne hentes. */
  images: string[];
  failedImages: number;
}

/**
 * "Indsæt fra leverandør": personalet kopierer hele leverandørens produktside
 * (Ctrl+A, Ctrl+C) og indsætter her. Vi læser titel, mærke, modeller, specs,
 * fordele, beskrivelse og billeder ud, henter billederne hjem, og lader
 * formularen udfylde sig selv. Intet gemmes før man trykker Opret.
 */
export function SupplierImport({ onApply }: { onApply: (result: SupplierImportResult) => void }) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<SupplierProduct | null>(null);
  const [html, setHtml] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const h = e.clipboardData.getData("text/html");
    const t = e.clipboardData.getData("text/plain");
    if (!t) return;
    e.preventDefault();
    setHtml(h);
    setRaw(t);
    setParsed(parseSupplierPaste(t, h));
    setError(null);
  }

  function reparse(text: string) {
    setRaw(text);
    setParsed(text.trim() ? parseSupplierPaste(text, html) : null);
  }

  async function apply() {
    if (!parsed) return;
    setImporting(true);
    setError(null);
    let images: string[] = [];
    let failedImages = 0;
    try {
      if (parsed.imageUrls.length) {
        const res = await fetch("/api/admin/products/import-images", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ urls: parsed.imageUrls.slice(0, 6), folder: "accessories" }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          images = data.images ?? [];
          failedImages = (data.failed ?? []).length;
        } else {
          failedImages = parsed.imageUrls.length;
        }
      }
      onApply({ product: parsed, suggestedTitle: suggestTitle(parsed), images, failedImages });
      setOpen(false);
    } catch {
      setError("Billederne kunne ikke hentes. Oplysningerne er udfyldt, upload billederne manuelt.");
      onApply({ product: parsed, suggestedTitle: suggestTitle(parsed), images: [], failedImages: parsed.imageUrls.length });
    } finally {
      setImporting(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-sand bg-white px-4 py-3">
        <p className="text-[14px] text-charcoal">
          Har du produktet hos leverandøren? <span className="text-gray">Kopiér hele produktsiden, så udfylder vi det meste.</span>
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>Indsæt fra leverandør</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-sand bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-medium text-charcoal">Indsæt leverandørens produktside</p>
          <p className="text-[13px] text-gray">
            Åbn produktet hos leverandøren, tryk Ctrl+A og Ctrl+C, og indsæt her. Virker med Euro Mobile Company og lignende sider.
          </p>
        </div>
        <Button size="sm" variant="quiet" onClick={() => { setOpen(false); setParsed(null); setRaw(""); }}>Luk</Button>
      </div>
      <Textarea
        value={raw}
        onPaste={handlePaste}
        onChange={(e) => reparse(e.target.value)}
        rows={parsed ? 3 : 6}
        placeholder="Indsæt her (Ctrl+V)"
        className="font-mono !text-[12px]"
        autoFocus
      />
      {parsed && (
        <div className="rounded-lg bg-cream p-3 text-[13px]">
          <p className="font-medium text-charcoal">{parsed.title || "Kunne ikke finde en titel"}</p>
          <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
            <dt className="text-gray">Mærke</dt><dd>{parsed.brand ?? "–"}{parsed.articleNumber ? ` · ${parsed.articleNumber}` : ""}</dd>
            <dt className="text-gray">Passer til</dt>
            <dd>
              {parsed.modelSlugs.map((s) => labelBySlug.get(s) ?? s).join(", ") || "–"}
              {parsed.unknownModels.length > 0 && <span className="text-[#8A4B08]"> · ukendt: {parsed.unknownModels.join(", ")}</span>}
            </dd>
            <dt className="text-gray">Kategori</dt><dd>{parsed.guess.subcategory}{Object.entries(parsed.guess.attributes).map(([k, v]) => ` · ${k}: ${v}`).join("")}</dd>
            <dt className="text-gray">Specs</dt><dd>{["magsafe", "material", "color"].map((k) => parsed.specs[k] ? `${k}: ${parsed.specs[k]}` : null).filter(Boolean).join(" · ") || "–"}</dd>
            <dt className="text-gray">Tekst</dt><dd>{parsed.benefits.length} fordele · {parsed.description ? `${parsed.description.length} tegn beskrivelse` : "ingen beskrivelse"}</dd>
            <dt className="text-gray">Billeder</dt><dd>{parsed.imageUrls.length || "ingen fundet, upload selv"}</dd>
            <dt className="text-gray">Indkøb</dt><dd>{parsed.priceEur != null ? `€${parsed.priceEur.toFixed(2)}` : "–"}{parsed.advisedPriceEur != null ? ` · vejl. €${parsed.advisedPriceEur.toFixed(2)}` : ""}</dd>
          </dl>
          {error && <div className="mt-2"><Notice tone="warning">{error}</Notice></div>}
          <div className="mt-3 flex items-center gap-2">
            <Button variant="primary" size="sm" loading={importing} disabled={!parsed.title} onClick={apply}>
              {parsed.imageUrls.length ? "Brug oplysningerne og hent billeder" : "Brug oplysningerne"}
            </Button>
            <span className="text-[12px] text-gray">Du kan rette alt bagefter.</span>
          </div>
        </div>
      )}
    </div>
  );
}

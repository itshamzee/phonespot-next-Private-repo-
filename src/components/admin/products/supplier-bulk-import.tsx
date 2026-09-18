"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, Field, Input, Notice, PageHeader, Tag, Textarea } from "@/components/admin/ui";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { parseKrToOere } from "./create/money";
import { removeBackgroundAndUpload } from "@/lib/images/remove-background-client";

/**
 * Importér mange varer fra leverandøren på én gang: indsæt et link til en
 * kategori-/filterside (eller produktlinks), se hvad der kommer med, ret
 * priser, og opret dem som kladder. Intet bliver synligt på webshoppen, før
 * kladden er set igennem og sat "På webshoppen".
 */

interface Preview {
  url: string;
  articleNumber: string | null;
  supplierTitle: string;
  title: string;
  brand: string | null;
  subcategory: string;
  models: string[];
  unknownModels: string[];
  image: string | null;
  imageCount: number;
  advisedPriceEur: number | null;
  suggestedPrice: number | null;
  existing: { id: string; title: string; status: string } | null;
}

interface Item {
  url: string;
  state: "loading" | "ready" | "error" | "creating" | "cutting" | "created";
  preview?: Preview;
  error?: string;
  selected: boolean;
  price: string;
  createdId?: string;
  /** Hvad fritlægningen er i gang med, eller hvorfor den sprang over. */
  cutNote?: string;
}

const labelBySlug = new Map(TILBEHOER_DEVICES.map((d) => [d.slug, d.label]));

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/admin/products/supplier-import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Noget gik galt. Prøv igen.");
  return data as T;
}

/** Kører opgaverne med få ad gangen, så leverandørens side ikke bliver overbelastet. */
async function inBatches<T>(items: T[], size: number, run: (item: T) => Promise<void>, cancelled: () => boolean) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
        if (cancelled()) return;
        await run(next);
      }
    }),
  );
}

export function SupplierBulkImport() {
  const [links, setLinks] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [phase, setPhase] = useState<"idle" | "listing" | "previewing" | "creating">("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bulkPrice, setBulkPrice] = useState("");
  const [cutFirst, setCutFirst] = useState(true);
  const runId = useRef(0);

  const patch = (url: string, change: Partial<Item>) => setItems((list) => list.map((i) => (i.url === url ? { ...i, ...change } : i)));

  async function load() {
    const urls = links.split(/\s+/).map((l) => l.trim()).filter(Boolean);
    if (urls.length === 0) return;
    const id = ++runId.current;
    setError(null);
    setNotice(null);
    setItems([]);
    setPhase("listing");
    try {
      const found: string[] = [];
      let truncated = false;
      for (const url of urls) {
        const out = await call<{ productUrls: string[]; total: number; truncated: boolean }>({ action: "list", url });
        truncated ||= out.truncated;
        for (const u of out.productUrls) if (!found.includes(u)) found.push(u);
      }
      if (id !== runId.current) return;
      if (found.length === 0) {
        setError("Der blev ikke fundet nogen varer på det link. Åbn kategorien hos leverandøren, vælg mærke og model i filtrene, og kopiér adressen fra browseren.");
        setPhase("idle");
        return;
      }
      if (truncated) setNotice("Listen er lang, så kun de første 150 varer er hentet. Brug leverandørens filtre (mærke, serie, model) til at dele den op.");
      setItems(found.map((url) => ({ url, state: "loading", selected: false, price: "" })));
      setPhase("previewing");
      await inBatches(
        found,
        2,
        async (url) => {
          try {
            const preview = await call<Preview>({ action: "preview", url });
            if (id !== runId.current) return;
            patch(url, { state: "ready", preview, selected: !preview.existing && Boolean(preview.suggestedPrice), price: preview.suggestedPrice ? String(preview.suggestedPrice / 100) : "" });
          } catch (err) {
            if (id === runId.current) patch(url, { state: "error", error: err instanceof Error ? err.message : "Kunne ikke hentes" });
          }
        },
        () => id !== runId.current,
      );
    } catch (err) {
      if (id === runId.current) setError(err instanceof Error ? err.message : "Kunne ikke hente listen");
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }

  async function createSelected() {
    const id = ++runId.current;
    const todo = items.filter((i) => i.selected && i.state === "ready");
    setPhase("creating");
    setError(null);
    // Fritlægning kører i browseren og er tung, så den tager ét billede ad gangen i sin egen kø
    const cutQueue: Promise<void>[] = [];
    let cutChain = Promise.resolve();
    const cut = (url: string, productId: string, images: string[]) => {
      cutChain = cutChain.then(async () => {
        if (id !== runId.current || !images[0]) return;
        patch(url, { state: "cutting", cutNote: "Fritlægger" });
        try {
          const cutUrl = await removeBackgroundAndUpload(images[0], `sku/${productId}`, (text) => patch(url, { cutNote: text }));
          const res = await fetch(`/api/admin/products/${productId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ images: [cutUrl, ...images.slice(1)] }) });
          if (!res.ok) throw new Error("save");
          patch(url, { state: "created", cutNote: undefined });
        } catch {
          patch(url, { state: "created", cutNote: "Baggrunden kunne ikke fjernes. Gør det fra kladden." });
        }
      });
      cutQueue.push(cutChain);
    };
    await inBatches(
      todo,
      2,
      async (item) => {
        patch(item.url, { state: "creating" });
        try {
          const out = await call<{ id: string; images: string[] }>({ action: "create", url: item.url, price: parseKrToOere(item.price) });
          patch(item.url, { state: "created", createdId: out.id, selected: false });
          if (cutFirst) cut(item.url, out.id, out.images);
        } catch (err) {
          patch(item.url, { state: "error", error: err instanceof Error ? err.message : "Blev ikke oprettet", selected: false });
        }
      },
      () => id !== runId.current,
    );
    await Promise.all(cutQueue);
    if (id === runId.current) setPhase("idle");
  }

  const ready = items.filter((i) => i.state === "ready");
  const selectable = ready.filter((i) => !i.preview?.existing);
  const selected = selectable.filter((i) => i.selected);
  const missingPrice = selected.filter((i) => !parseKrToOere(i.price));
  const created = items.filter((i) => i.state === "created" || i.state === "cutting");
  const cutting = items.filter((i) => i.state === "cutting").length;
  const loadingCount = items.filter((i) => i.state === "loading").length;
  const busy = phase !== "idle";

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Importér fra leverandør"
        backHref="/admin/produkter/ny"
        backLabel="Opret produkt"
        description="Henter varer direkte fra euromobilecompany.com: navn, varenummer, modeller, specifikationer, billeder og vejledende pris. De oprettes som kladder med dansk tekst, så du kan se dem igennem, før de kommer på webshoppen."
      />

      <div className="max-w-[760px]">
        <Field
          label="Link fra euromobilecompany.com"
          hint="En kategori med filtre valgt (fx Cases and Covers, For Apple, iPhone 17 Pro) eller ét eller flere produktlinks, ét pr. linje."
        >
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              placeholder="https://euromobilecompany.com/en/accessories/cases-and-covers?fbrand=For%20Apple&fserie=For%20iPhone&fmodel=iPhone%2017%20Pro"
            />
          )}
        </Field>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={load} loading={phase === "listing"} disabled={busy || !links.trim()}>
            Hent varer
          </Button>
          {phase === "previewing" && <p className="text-[13px] text-gray">Læser varer: {items.length - loadingCount} af {items.length}</p>}
        </div>
      </div>

      {error && <div className="mt-5 max-w-[760px]"><Notice tone="danger">{error}</Notice></div>}
      {notice && <div className="mt-5 max-w-[760px]"><Notice tone="warning">{notice}</Notice></div>}

      {items.length > 0 && (
        <>
          <div className="sticky top-0 z-10 -mx-4 mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-sand bg-cream/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
            <label className="flex items-center gap-2 text-[14px] text-charcoal">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-sand accent-[#1A3D2E]"
                checked={selectable.length > 0 && selected.length === selectable.length}
                onChange={(e) => setItems((list) => list.map((i) => (i.state === "ready" && !i.preview?.existing ? { ...i, selected: e.target.checked } : i)))}
              />
              {selected.length} af {selectable.length} valgt
            </label>
            <div className="flex items-center gap-2">
              <div className="w-[110px]"><Input inputMode="decimal" suffix="kr" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} placeholder="Pris" aria-label="Pris til alle valgte" /></div>
              <Button size="sm" disabled={!parseKrToOere(bulkPrice) || selected.length === 0} onClick={() => setItems((list) => list.map((i) => (i.selected ? { ...i, price: bulkPrice } : i)))}>
                Sæt på valgte
              </Button>
            </div>
            <label className="flex items-center gap-2 text-[14px] text-charcoal">
              <input type="checkbox" className="h-4 w-4 rounded border-sand accent-[#1A3D2E]" checked={cutFirst} onChange={(e) => setCutFirst(e.target.checked)} disabled={busy} />
              Fritlæg første billede
            </label>
            <div className="ml-auto flex items-center gap-3">
              {phase === "creating" && cutting > 0 && <p className="text-[13px] text-gray">Fritlægger billeder</p>}
              {missingPrice.length > 0 && <p className="text-[13px] text-[#8A4B08]">{missingPrice.length} mangler pris</p>}
              <Button variant="primary" loading={phase === "creating"} disabled={busy || selected.length === 0 || missingPrice.length > 0} onClick={createSelected}>
                {selected.length === 1 ? "Opret 1 kladde" : `Opret ${selected.length} kladder`}
              </Button>
            </div>
          </div>

          {created.length > 0 && phase === "idle" && (
            <div className="mt-4">
              <Notice tone="success" title={created.length === 1 ? "1 kladde er oprettet" : `${created.length} kladder er oprettet`}>
                De er ikke synlige på webshoppen endnu. Se dem igennem under{" "}
                <Link href="/admin/tilbehoer" className="underline underline-offset-2">Tilbehør</Link>, og sæt dem på webshoppen, når pris og tekst er i orden.
              </Notice>
            </div>
          )}

          <ul className="mt-2 divide-y divide-sand">
            {items.map((item) => {
              const p = item.preview;
              return (
                <li key={item.url} className="flex items-center gap-3 py-3 sm:gap-4">
                  <input
                    type="checkbox"
                    aria-label={`Vælg ${p?.title ?? item.url}`}
                    className="h-4 w-4 shrink-0 rounded border-sand accent-[#1A3D2E]"
                    disabled={item.state !== "ready" || Boolean(p?.existing) || busy}
                    checked={item.selected}
                    onChange={(e) => patch(item.url, { selected: e.target.checked })}
                  />
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p?.image && <img src={p.image.replace(/-\d+x\d+\.(jpe?g|png|webp)$/i, "-500x500.$1")} alt="" loading="lazy" className="h-full w-full object-contain" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {p ? (
                      <>
                        <p className="line-clamp-2 text-[14px] font-medium leading-snug text-charcoal">{p.title}</p>
                        <p className="mt-0.5 truncate text-[12px] text-gray">
                          {[p.articleNumber, p.models.map((m) => labelBySlug.get(m) ?? m).join(", ") || "ingen model fundet", `${p.imageCount} billeder`].filter(Boolean).join(" · ")}
                        </p>
                        {p.unknownModels.length > 0 && <p className="mt-0.5 text-[12px] text-[#8A4B08]">Ukendt hos os: {p.unknownModels.join(", ")}</p>}
                      </>
                    ) : (
                      <p className="truncate text-[13px] text-gray">{item.state === "error" ? item.url : "Læser varen"}</p>
                    )}
                    {item.state === "error" && <p className="mt-0.5 text-[12px] text-[#B42318]">{item.error}</p>}
                    {item.cutNote && <p className={`mt-0.5 text-[12px] ${item.state === "cutting" ? "text-gray" : "text-[#8A4B08]"}`}>{item.cutNote}</p>}
                  </div>
                  <div className="hidden w-[84px] shrink-0 text-right text-[12px] text-gray sm:block">
                    {p?.advisedPriceEur != null ? `Vejl. €${p.advisedPriceEur.toFixed(2)}` : ""}
                  </div>
                  <div className="w-[104px] shrink-0">
                    {item.state === "created" || item.state === "cutting" ? (
                      <Link href={`/admin/produkter/${item.createdId}`} className="text-[13px] font-medium text-green-eco underline-offset-2 hover:underline">Åbn kladden</Link>
                    ) : p?.existing ? (
                      <Link href={`/admin/produkter/${p.existing.id}`} className="text-[13px] text-gray underline-offset-2 hover:underline">Findes allerede</Link>
                    ) : item.state === "creating" ? (
                      <Tag>Opretter</Tag>
                    ) : item.state === "ready" ? (
                      <Input inputMode="decimal" suffix="kr" value={item.price} onChange={(e) => patch(item.url, { price: e.target.value })} aria-label={`Pris for ${p?.title}`} />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {selected.length > 0 && (
            <p className="mt-3 text-[13px] text-gray">
              Priserne er forslag ud fra leverandørens vejledende pris. De kan rettes her eller på kladden bagefter.
            </p>
          )}
        </>
      )}
    </div>
  );
}

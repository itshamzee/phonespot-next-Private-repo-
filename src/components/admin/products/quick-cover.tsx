"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Chip, Field, Input, Notice, PageHeader, Panel, Select } from "@/components/admin/ui";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { ean13Svg, isValidEan13 } from "@/lib/barcode/ean13";
import {
  preloadBackgroundRemoval,
  removeBackgroundFromBlob,
  uploadImageBlob,
} from "@/lib/images/remove-background-client";
import { composeStudioPhoto } from "@/lib/images/studio-photo-client";

/**
 * Hurtig optagelse af løse covers fra lageret i Vejle, bygget til mobilen:
 * scan (eller lav) stregkode → kendt vare: læg antal på lager · ny vare: vælg
 * model, type, farve og pris, tag et foto, som fritlægges og sættes på en
 * ensartet baggrund → gem. Varen kommer på /covers-udsalg med det samme.
 */

type Store = "vejle" | "slagelse";

interface FoundProduct {
  id: string;
  title: string;
  slug: string | null;
  selling_price: number;
  images: string[] | null;
  status: string;
  stock: Record<string, number>;
}

const COVER_TYPES = [
  { value: "Clear", label: "Gennemsigtigt", noun: "Gennemsigtigt cover" },
  { value: "Slim", label: "Silikone", noun: "Silikonecover" },
  { value: "Rugged", label: "Stødsikkert", noun: "Stødsikkert cover" },
  { value: "Wallet", label: "Pung", noun: "Pungcover" },
  { value: "Flip", label: "Flip", noun: "Flipcover" },
  { value: "Bumper", label: "Bumper", noun: "Bumper" },
] as const;
type CoverType = (typeof COVER_TYPES)[number]["value"];

const COLORS = ["Gennemsigtig", "Sort", "Hvid", "Blå", "Rød", "Pink", "Grøn", "Lilla", "Brun"];
const PRICES = [49, 59, 79, 99];

const BRAND_LABEL: Record<string, string> = {
  apple: "Apple",
  samsung: "Samsung",
  google: "Google",
  oneplus: "OnePlus",
  huawei: "Huawei",
  xiaomi: "Xiaomi",
};

function coverTitle(type: CoverType, modelLabel: string, color: string): string {
  const noun = COVER_TYPES.find((t) => t.value === type)?.noun ?? "Cover";
  // "Gennemsigtigt cover ..., gennemsigtig" siger det samme to gange
  const showColor = color && !(type === "Clear" && color === "Gennemsigtig");
  return `${noun} til ${modelLabel}${showColor ? `, ${color.toLowerCase()}` : ""}`;
}

/** Mobilfotos er 12 MP; fritlægningen er lige så god og langt hurtigere ved ca. 1600 px. */
async function downscale(file: Blob, max = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/jpeg", 0.92),
  );
}

/** Udskriver en 62 × 29 mm etiket med stregkode, navn og pris. */
function printLabel(ean: string, title: string, priceKr: number) {
  if (!isValidEan13(ean)) return;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  const safeTitle = title.replace(/[<>&"]/g, "");
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: 62mm 29mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 62mm; height: 29mm; padding: 1.5mm 2.5mm; font-family: Arial, sans-serif; display: flex; flex-direction: column; justify-content: space-between; }
    .row { display: flex; justify-content: space-between; align-items: baseline; gap: 2mm; }
    .title { font-size: 8px; line-height: 1.15; max-height: 2.4em; overflow: hidden; }
    .price { font-size: 13px; font-weight: 700; white-space: nowrap; }
    svg { width: 100%; height: 15mm; }
  </style></head><body>
    <div class="row"><div class="title">${safeTitle}</div><div class="price">${priceKr} kr.</div></div>
    ${ean13Svg(ean)}
  </body></html>`);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 150);
}

export function QuickCover() {
  const [store, setStore] = useState<Store>("vejle");
  const [ean, setEan] = useState("");
  const [eanGenerated, setEanGenerated] = useState(false);
  const [step, setStep] = useState<"scan" | "existing" | "new" | "done">("scan");
  const [found, setFound] = useState<FoundProduct | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // New-product form. Model, type and price are kept between covers so a box
  // of the same kind goes fast.
  const [model, setModel] = useState("");
  const [type, setType] = useState<CoverType>("Clear");
  const [color, setColor] = useState("Gennemsigtig");
  const [price, setPrice] = useState(59);
  const [quantity, setQuantity] = useState("1");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [done, setDone] = useState<{ title: string; url: string | null; ean: string; quantity: number; priceKr: number } | null>(null);

  const eanRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "scan") eanRef.current?.focus();
  }, [step]);

  useEffect(() => () => void scannerRef.current?.stop().catch(() => {}), []);

  const modelLabel = TILBEHOER_DEVICES.find((d) => d.slug === model)?.label ?? "";
  const title = modelLabel ? coverTitle(type, modelLabel, color) : "";
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));

  function reset(keepSetup = true) {
    setEan("");
    setEanGenerated(false);
    setFound(null);
    setError(null);
    setPhoto(null);
    setPhotoStatus(null);
    setQuantity("1");
    if (!keepSetup) {
      setModel("");
      setType("Clear");
      setColor("Gennemsigtig");
      setPrice(59);
    }
    setStep("scan");
  }

  async function lookup(code: string) {
    const clean = code.trim().replace(/[^A-Za-z0-9-]/g, "");
    if (clean.length < 4) {
      setError("Stregkoden er for kort");
      return;
    }
    setEan(clean);
    setError(null);
    setBusy("Slår stregkoden op");
    try {
      const res = await fetch(`/api/admin/accessories/by-ean?ean=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Opslaget fejlede");
      if (data.product) {
        setFound(data.product);
        setStep("existing");
      } else {
        setFound(null);
        setStep("new");
        void preloadBackgroundRemoval();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaget fejlede. Prøv igen.");
    } finally {
      setBusy(null);
    }
  }

  async function generateEan() {
    setError(null);
    setBusy("Laver stregkode");
    try {
      const res = await fetch("/api/admin/accessories/generate-ean", { method: "POST" });
      const data = await res.json();
      if (!data?.ean) throw new Error();
      setEan(data.ean);
      setEanGenerated(true);
      setStep("new");
      void preloadBackgroundRemoval();
    } catch {
      setError("Kunne ikke lave en stregkode. Prøv igen.");
    } finally {
      setBusy(null);
    }
  }

  async function startCamera() {
    setError(null);
    setScanning(true);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("quick-cover-scanner", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.CODE_128,
        ],
        verbose: false,
      });
      scannerRef.current = { stop: () => scanner.stop().then(() => scanner.clear()) };
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 140 } },
        (text) => {
          void scannerRef.current?.stop().catch(() => {});
          scannerRef.current = null;
          setScanning(false);
          void lookup(text);
        },
        () => {},
      );
    } catch {
      setScanning(false);
      scannerRef.current = null;
      setError("Kameraet kunne ikke startes. Giv adgang til kameraet, eller skriv stregkoden.");
    }
  }

  async function stopCamera() {
    await scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setScanning(false);
  }

  async function addStock(productId: string) {
    if (qty < 1) return;
    setError(null);
    setBusy("Lægger på lager");
    try {
      const res = await fetch("/api/admin/accessories/by-ean", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, store, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Lageret blev ikke opdateret");
      setDone({ title: found?.title ?? "Varen", url: null, ean, quantity: data.quantity, priceKr: (found?.selling_price ?? 0) / 100 });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lageret blev ikke opdateret");
    } finally {
      setBusy(null);
    }
  }

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPhoto(null);
    try {
      setPhotoStatus("Forbereder billede");
      const small = await downscale(file);
      const cut = await removeBackgroundFromBlob(small, setPhotoStatus);
      setPhotoStatus("Laver produktbillede");
      const studio = await composeStudioPhoto(cut);
      setPhotoStatus("Gemmer billede");
      const url = await uploadImageBlob(studio, `cover-${ean || Date.now()}.webp`, "accessories");
      setPhoto(url);
      setPhotoStatus(null);
    } catch {
      setPhotoStatus(null);
      setError("Billedet kunne ikke behandles. Prøv igen med varen på en rolig baggrund.");
    }
  }

  async function createProduct() {
    if (!model || !photo || qty < 1) return;
    setError(null);
    setBusy("Opretter cover");
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "accessory",
          items: [
            {
              title,
              subcategory: "cover",
              brand: null,
              models: [model],
              mode: "universal",
              sellingPrice: price * 100,
              salePrice: null,
              costPrice: null,
              ean: ean || null,
              images: [photo],
              shortDescription: `Passer til ${modelLabel}. Lagerrydning fra vores lager i Vejle.`,
              description: `${title}. Coveret er lavet til ${modelLabel}, så knapper, kamera og stik sidder, hvor de skal. Sendes fra Vejle, eller hent det gratis i butikken i Vejle eller Slagelse.`,
              highlights: [
                `Passer til ${modelLabel}`,
                "Gratis levering til pakkeshop",
                "Hent gratis i Vejle eller Slagelse",
                "14 dages fortrydelsesret og 2 års reklamationsret",
              ],
              attributes: { case_type: type, udsalg: "Ja", ...(color ? { color } : {}) },
              alwaysInStock: false,
              status: "published",
              stock: { stores: { [store]: qty } },
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Coveret blev ikke oprettet");
      const created = data.created?.[0];
      setDone({ title, url: created?.url ?? null, ean, quantity: qty, priceKr: price });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coveret blev ikke oprettet");
    } finally {
      setBusy(null);
    }
  }

  const brands = [...new Set(TILBEHOER_DEVICES.map((d) => d.brand))];

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-4">
      <PageHeader
        title="Hurtig cover-optagelse"
        description="Scan, tag et billede og gem. Coveret kommer på covers-udsalget med det samme."
        backHref="/admin/produkter"
        backLabel="Produkter"
      />

      <Panel className="flex items-center justify-between gap-3 p-3">
        <span className="text-[14px] text-charcoal/70">Lager i</span>
        <div className="flex gap-2">
          <Chip selected={store === "vejle"} onToggle={() => setStore("vejle")}>Vejle</Chip>
          <Chip selected={store === "slagelse"} onToggle={() => setStore("slagelse")}>Slagelse</Chip>
        </div>
      </Panel>

      {error && <Notice tone="danger">{error}</Notice>}

      {step === "scan" && (
        <Panel className="space-y-4 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void lookup(ean);
            }}
          >
            <Field label="Stregkode" hint="Scan med en stregkodelæser, kameraet eller skriv cifrene.">
              {(id) => (
                <div className="flex gap-2">
                  <Input
                    id={id}
                    ref={eanRef}
                    autoComplete="off"
                    autoCapitalize="characters"
                    value={ean}
                    onChange={(e) => setEan(e.target.value.replace(/[^A-Za-z0-9-]/g, ""))}
                    placeholder="5701234567890"
                  />
                  <Button type="submit" loading={busy === "Slår stregkoden op"} className="shrink-0">Find</Button>
                </div>
              )}
            </Field>
          </form>
          <div id="quick-cover-scanner" className={scanning ? "overflow-hidden rounded-lg" : "hidden"} />
          <div className="grid grid-cols-2 gap-2">
            {scanning ? (
              <Button variant="secondary" onClick={() => void stopCamera()}>Stop kamera</Button>
            ) : (
              <Button variant="secondary" onClick={() => void startCamera()}>Scan med kamera</Button>
            )}
            <Button variant="secondary" onClick={() => void generateEan()} loading={busy === "Laver stregkode"}>
              Ingen stregkode
            </Button>
          </div>
        </Panel>
      )}

      {step === "existing" && found && (
        <Panel className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            {found.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={found.images[0]} alt="" className="h-16 w-16 rounded-lg bg-cream object-contain" />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-cream" />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-charcoal">{found.title}</p>
              <p className="text-[13px] text-charcoal/60">
                {(found.selling_price / 100).toLocaleString("da-DK")} kr. · Vejle {found.stock.vejle ?? 0} · Slagelse {found.stock.slagelse ?? 0}
              </p>
            </div>
          </div>
          <Notice tone="info">Stregkoden findes allerede. Skriv, hvor mange du lægger på lager.</Notice>
          <Field label="Antal">
            {(id) => <Input id={id} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} />}
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => reset()}>Annuller</Button>
            <Button onClick={() => void addStock(found.id)} disabled={qty < 1} loading={busy === "Lægger på lager"}>
              Læg {qty || ""} på lager
            </Button>
          </div>
        </Panel>
      )}

      {step === "new" && (
        <Panel className="space-y-5 p-4">
          <p className="text-[13px] text-charcoal/60">
            Stregkode <span className="font-mono text-charcoal">{ean}</span>
            {eanGenerated ? " (lavet af systemet, print en etiket bagefter)" : ""}
          </p>

          <Field label="Passer til" required>
            {(id) => (
              <Select id={id} value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="">Vælg model</option>
                {brands.map((brand) => (
                  <optgroup key={brand} label={BRAND_LABEL[brand] ?? brand}>
                    {TILBEHOER_DEVICES.filter((d) => d.brand === brand).map((d) => (
                      <option key={d.slug} value={d.slug}>{d.label}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Type">
            {() => (
              <div className="flex flex-wrap gap-2">
                {COVER_TYPES.map((t) => (
                  <Chip key={t.value} selected={type === t.value} onToggle={() => setType(t.value)}>{t.label}</Chip>
                ))}
              </div>
            )}
          </Field>

          <Field label="Farve">
            {() => (
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <Chip key={c} size="sm" selected={color === c} onToggle={() => setColor(color === c ? "" : c)}>{c}</Chip>
                ))}
              </div>
            )}
          </Field>

          <Field label="Pris">
            {() => (
              <div className="flex flex-wrap gap-2">
                {PRICES.map((p) => (
                  <Chip key={p} selected={price === p} onToggle={() => setPrice(p)}>{p} kr.</Chip>
                ))}
              </div>
            )}
          </Field>

          <Field label="Antal på lager">
            {(id) => <Input id={id} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} />}
          </Field>

          <Field label="Billede" required hint="Læg coveret på et bord med rolig baggrund og fotografér det lige forfra.">
            {() => (
              <div className="space-y-2">
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    void handlePhoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {photo ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="Produktbillede" className="h-32 w-32 rounded-lg border border-sand object-contain" />
                    <Button variant="secondary" onClick={() => photoInput.current?.click()}>Tag nyt</Button>
                  </div>
                ) : (
                  <Button variant="secondary" onClick={() => photoInput.current?.click()} loading={photoStatus != null} className="w-full">
                    {photoStatus ?? "Tag billede"}
                  </Button>
                )}
              </div>
            )}
          </Field>

          {title && (
            <p className="rounded-lg bg-cream px-3 py-2 text-[14px] text-charcoal">
              {title} · <strong>{price} kr.</strong>
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => reset()}>Annuller</Button>
            <Button
              onClick={() => void createProduct()}
              disabled={!model || !photo || qty < 1}
              loading={busy === "Opretter cover"}
            >
              Gem cover
            </Button>
          </div>
          {(!model || !photo) && (
            <p className="text-[13px] text-charcoal/60">
              Mangler: {[!model && "model", !photo && "billede"].filter(Boolean).join(" og ")}
            </p>
          )}
        </Panel>
      )}

      {step === "done" && done && (
        <Panel className="space-y-4 p-4">
          <Notice tone="success" title="Gemt">
            {done.title} · {done.quantity} på lager i {store === "vejle" ? "Vejle" : "Slagelse"}
          </Notice>
          {isValidEan13(done.ean) && (
            <div
              className="mx-auto w-56"
              aria-label={`Stregkode ${done.ean}`}
              dangerouslySetInnerHTML={{ __html: ean13Svg(done.ean) }}
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            {isValidEan13(done.ean) && (
              <Button variant="secondary" onClick={() => printLabel(done.ean, done.title, done.priceKr)}>Print etiket</Button>
            )}
            {done.url && (
              <Link href={done.url} target="_blank" className="flex h-10 items-center justify-center rounded-lg border border-sand text-[14px]">
                Se på webshoppen
              </Link>
            )}
          </div>
          <Button className="w-full" onClick={() => reset()}>Næste cover</Button>
          <button type="button" className="w-full text-[13px] text-charcoal/60 underline" onClick={() => reset(false)}>
            Ny kasse (nulstil model, type og pris)
          </button>
        </Panel>
      )}
    </div>
  );
}

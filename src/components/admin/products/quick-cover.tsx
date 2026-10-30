"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Chip, Field, Input, Notice, Panel, Textarea } from "@/components/admin/ui";
import { ModelsPicker } from "@/components/admin/products/create/models-picker";
import { TILBEHOER_DEVICES, type TilbehoerDevice } from "@/lib/tilbehoer-config";
import { ean13Svg, isValidEan13 } from "@/lib/barcode/ean13";
import { boxLabel, type SaleBox } from "@/lib/lagersalg/boxes";
import { isLagersalg } from "@/lib/lagersalg/is-lagersalg";
import { preloadBackgroundRemoval } from "@/lib/images/remove-background-client";
import { PRICE_CHIPS, PRICE_CHIPS_BAG } from "@/lib/accessory-intake/pricing";
import { subcategoryFor } from "@/lib/accessory-intake/match";
import { aiTextIsStale } from "@/lib/accessory-intake/ai-text";
import type { Identified, IntakeCaseType, IntakeProductType, MatchCandidate } from "@/lib/accessory-intake/types";
import { MatchCard, saleKrFor, type MatchProduct } from "./quick-intake/match-card";
import { PhotoPicker } from "./quick-intake/photo-picker";
import { blobToBase64, downscale } from "./quick-intake/image-utils";
import { BoxBar } from "./quick-intake/box-bar";
import { printLabel } from "./quick-intake/label";

/**
 * Hurtig optagelse af tilbehør fra lageret i Vejle, bygget til mobilen:
 * scan stregkode (kendt vare: læg antal på lager) eller tag et foto af pakken
 * eller varen → AI udfylder type, mærke, model(ler), farve og tekst og leder
 * efter dubletter → praktikanten tjekker, tager et produktfoto, taster antal og
 * gemmer. Covers, tasker og andet kommer på /lagersalg og lægges i butikkens
 * åbne kasse; glas kommer på /beskyttelsesglas og får ingen kasse.
 */

type Store = "vejle" | "slagelse";
type Step = "scan" | "existing" | "identify" | "match" | "new" | "done";

const PRODUCT_TYPES: { value: IntakeProductType; label: string }[] = [
  { value: "cover", label: "Cover" },
  { value: "flip_cover", label: "Flip/pung" },
  { value: "ipad_cover", label: "iPad-cover" },
  { value: "screen_protector", label: "Glas" },
  { value: "bag", label: "Taske" },
  { value: "other", label: "Andet" },
];

const LAPTOP_SIZES = ['13"', '14"', '15"/15,6"', '16"', '17"'];
const BAG_TYPES = ["Sleeve", "Skuldertaske", "Rygsæk"];

const isIpad = (d: TilbehoerDevice) => d.slug.startsWith("ipad-");

/** Startpris pr. varetype (kr.). */
const defaultPriceFor = (t: IntakeProductType) => (t === "bag" ? 149 : t === "screen_protector" ? 49 : 59);

const CASE_TYPES: { value: IntakeCaseType; label: string; noun: string }[] = [
  { value: "Clear", label: "Gennemsigtigt", noun: "Gennemsigtigt cover" },
  { value: "Slim", label: "Silikone", noun: "Silikonecover" },
  { value: "Rugged", label: "Stødsikkert", noun: "Stødsikkert cover" },
  { value: "Bumper", label: "Bumper", noun: "Bumper" },
  { value: "Wallet", label: "Pung", noun: "Pungcover" },
  { value: "Flip", label: "Flip", noun: "Flipcover" },
];

const BASE_COLORS = ["Gennemsigtig", "Sort", "Hvid", "Blå", "Rød", "Lyserød", "Grøn", "Lilla", "Brun"];

const labelOf = (slug: string) => TILBEHOER_DEVICES.find((d) => d.slug === slug)?.label ?? slug;

/** Skabelontitel, når AI ikke har skrevet en (eller ikke virker). */
function templateTitle(
  type: IntakeProductType,
  caseType: IntakeCaseType | null,
  models: string[],
  color: string,
  bag?: { size: string | null; bagType: string },
): string {
  if (type === "bag") {
    if (!bag?.size) return "";
    return `${bag.bagType} til bærbar ${bag.size}${color ? `, ${color.toLowerCase()}` : ""}`;
  }
  const modelText = models.map(labelOf).join(" / ");
  if (!modelText) return "";
  const noun =
    type === "screen_protector"
      ? "Beskyttelsesglas"
      : type === "other"
        ? "Tilbehør"
        : (CASE_TYPES.find((t) => t.value === caseType)?.noun ?? "Cover");
  const showColor = color && type !== "screen_protector" && !(caseType === "Clear" && color === "Gennemsigtig");
  return `${noun} til ${modelText}${showColor ? `, ${color.toLowerCase()}` : ""}`;
}

/** Antal med store −/+ knapper, så det er nemt at ramme på en telefon. */
function QtyStepper({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  const btn =
    "flex h-12 w-14 shrink-0 items-center justify-center rounded-lg border border-sand bg-white text-[22px] font-medium text-charcoal active:bg-cream";
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Færre" className={btn} onClick={() => onChange(String(Math.max(1, n - 1)))}>
        −
      </button>
      <Input
        id={id}
        inputMode="numeric"
        className="h-12 text-center !text-[18px] font-semibold"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      />
      <button type="button" aria-label="Flere" className={btn} onClick={() => onChange(String(n + 1))}>
        +
      </button>
    </div>
  );
}

function AiHint() {
  return <span className="ml-1 text-[12px] font-normal text-charcoal/60">Udfyldt af AI, tjek</span>;
}

export function QuickCover() {
  const [store, setStore] = useState<Store>("vejle");
  const [ean, setEan] = useState("");
  const [step, setStep] = useState<Step>("scan");
  const [found, setFound] = useState<MatchProduct | null>(null);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [liveCandidates, setLiveCandidates] = useState<MatchCandidate[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Aflæsning
  const [identified, setIdentified] = useState<Identified | null>(null);

  // Formular til ny vare. Butik og pris huskes mellem varer ("Næste").
  const [productType, setProductType] = useState<IntakeProductType>("cover");
  const [models, setModels] = useState<string[]>([]);
  const [modelConfirmed, setModelConfirmed] = useState(false);
  const [caseType, setCaseType] = useState<IntakeCaseType | null>("Slim");
  const [color, setColor] = useState("");
  const [colors, setColors] = useState(BASE_COLORS);
  const [price, setPrice] = useState(59);
  // "Anden pris": fri pris i hele kroner (min. 10 kr.), når ingen chip passer.
  const [priceText, setPriceText] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [laptopSize, setLaptopSize] = useState<string | null>(null);
  const [bagType, setBagType] = useState("Sleeve");
  const [openBox, setOpenBox] = useState<SaleBox | null>(null);
  const [done, setDone] = useState<{
    title: string;
    url: string | null;
    ean: string;
    quantity: number;
    priceKr: number;
    boxNumber: number | null;
    lagersalg: boolean;
    warnings: string[];
  } | null>(null);

  const eanRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const readInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => void scannerRef.current?.stop().catch(() => {}), []);

  // Dubletsøgning igen, når praktikanten selv har valgt model (fx et løst cover).
  const manualModels = step === "new" && models.length > 0 && (!identified || aiTextIsStale(identified.models, models));
  useEffect(() => {
    if (!manualModels) {
      setLiveCandidates([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch("/api/admin/accessories/candidates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productType, brand: identified?.brand ?? null, caseType: caseType ?? null, color: color || null, models }),
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : { candidates: [] }))
        .then((d) => setLiveCandidates(d.candidates ?? []))
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [manualModels, models, productType, caseType, color, identified]);

  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  const isCase = productType === "cover" || productType === "flip_cover" || productType === "ipad_cover";
  const isBag = productType === "bag";
  const priceChips = isBag ? PRICE_CHIPS_BAG : PRICE_CHIPS;
  const autoTitle = templateTitle(productType, isCase ? caseType : null, models, color, { size: laptopSize, bagType });
  const finalTitle = (titleTouched ? title : title || autoTitle).trim();

  function reset(keepSetup = true) {
    setEan("");
    setFound(null);
    setCandidates([]);
    setLiveCandidates([]);
    setIdentified(null);
    setError(null);
    setAiNote(null);
    setPhoto(null);
    setPhotoKey((k) => k + 1);
    setQuantity("1");
    setModels([]);
    setModelConfirmed(false);
    setColor("");
    setTitle("");
    setTitleTouched(false);
    setDescription("");
    setLaptopSize(null);
    setPriceText("");
    if (!keepSetup) {
      setProductType("cover");
      setCaseType("Slim");
      setBagType("Sleeve");
      setPrice(defaultPriceFor("cover"));
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
        setStep("identify");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaget fejlede. Prøv igen.");
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
        { fps: 10, qrbox: (w: number, h: number) => ({ width: Math.round(Math.min(w * 0.85, 420)), height: Math.round(Math.min(h * 0.35, 200)) }) },
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


  function applyIdentified(i: Identified | null, priceKr: number) {
    setIdentified(i);
    setPrice(i?.productType === "bag" ? defaultPriceFor("bag") : priceKr);
    setPriceText("");
    if (!i) {
      setModelConfirmed(false);
      return;
    }
    setProductType(i.productType);
    setModels(i.models);
    setModelConfirmed(i.models.length > 0 && i.modelConfidence !== "low");
    setCaseType(i.caseType ?? (i.productType === "flip_cover" ? "Flip" : null));
    if (i.color) {
      setColor(i.color);
      setColors((list) => (list.includes(i.color!) ? list : [...list, i.color!]));
    }
    setTitle(i.titleDa);
    setTitleTouched(false);
    setDescription(i.descriptionDa);
  }

  async function identify(file: File | undefined) {
    if (!file) return;
    setError(null);
    setAiNote(null);
    setBusy("AI læser varen");
    void preloadBackgroundRemoval();
    try {
      const small = await downscale(file, 1280);
      const res = await fetch("/api/admin/accessories/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: await blobToBase64(small), mediaType: "image/jpeg" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Aflæsningen fejlede");
      applyIdentified(data.identified, data.priceKr ?? 59);
      if (data.aiError) setAiNote(data.aiError);
      const list: MatchCandidate[] = data.exact ? [data.exact] : (data.candidates ?? []);
      setCandidates(list);
      setStep(list.length > 0 ? "match" : "new");
    } catch (err) {
      setAiNote(err instanceof Error ? err.message : "AI kunne ikke læse billedet. Udfyld selv.");
      setStep("new");
    } finally {
      setBusy(null);
    }
  }

  async function addStock(product: MatchProduct) {
    if (qty < 1) return;
    setError(null);
    setBusy(`stock-${product.id}`);
    try {
      const res = await fetch("/api/admin/accessories/by-ean", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          store,
          quantity: qty,
          ...(product.status === "draft" ? { publish: { priceKr: saleKrFor(product) } } : {}),
        }),
      });
      const data = await res.json();
      // Lageret kan være gemt, selv om kassen blev lukket imens (409 med quantity): vis advarsel, ikke fejl.
      const savedAnyway = !res.ok && typeof data?.quantity === "number";
      if (!res.ok && !savedAnyway) throw new Error(data?.error ?? "Lageret blev ikke opdateret");
      const boxNumber: number | null = data.boxNumber ?? null;
      setDone({
        title: product.title,
        url: null,
        ean,
        quantity: data.quantity,
        priceKr: data.priceKr ?? product.selling_price / 100,
        boxNumber,
        lagersalg: boxNumber != null || isLagersalg({ subcategory: product.subcategory ?? null, attributes: product.attributes }),
        warnings: savedAnyway && data.error ? [data.error] : [],
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lageret blev ikke opdateret");
    } finally {
      setBusy(null);
    }
  }

  async function createProduct() {
    if (isBag ? !laptopSize : models.length === 0 || !modelConfirmed) return;
    if (!photo || qty < 1 || !finalTitle) return;
    setError(null);
    setBusy("Opretter vare");
    try {
      let code = ean;
      if (!code) {
        const res = await fetch("/api/admin/accessories/generate-ean", { method: "POST" });
        const data = await res.json();
        if (!data?.ean) throw new Error("Kunne ikke lave en stregkode. Prøv igen.");
        code = data.ean;
      }
      const subcategory = subcategoryFor(productType);
      const modelText = models.map(labelOf).join(", ");
      const genuine = identified?.isGenuineBrandProduct ? { genuine: "Ja" } : {};
      const readText = identified?.readText ? { ai_read_text: identified.readText.slice(0, 500) } : {};
      const attributes =
        subcategory === "cover"
          ? { ...(caseType ? { case_type: caseType } : {}), ...(color ? { color } : {}), udsalg: "Ja", ...genuine, ...readText }
          : subcategory === "screen_protector"
            ? { udsalg: "Ja", ...genuine, ...readText }
            : subcategory === "bag"
              ? { laptop_size: laptopSize!, bag_type: bagType, udsalg: "Ja", ...(color ? { color } : {}), ...genuine, ...readText }
              : { udsalg: "Ja", ...readText };
      const fits = isBag ? `bærbare op til ${laptopSize}` : modelText;
      const text = description.trim() || `${finalTitle}. Passer til ${fits}. Sendes fra Vejle, eller hent det gratis i butikken i Vejle eller Slagelse.`;
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "accessory",
          items: [
            {
              title: finalTitle,
              subcategory,
              brand: identified?.brand ?? null,
              models: isBag ? [] : models,
              mode: "universal",
              sellingPrice: price * 100,
              salePrice: null,
              costPrice: null,
              ean: code,
              images: [photo],
              shortDescription: `Passer til ${fits}. Lagerrydning fra vores lager i Vejle.`,
              description: text,
              highlights: [
                `Passer til ${fits}`,
                ...(identified?.features ?? []).slice(0, 2),
                "Gratis levering til pakkeshop",
                "14 dages fortrydelsesret ved køb online, 2 års reklamationsret",
              ],
              attributes,
              alwaysInStock: false,
              status: "published",
              stock: { stores: { [store]: qty } },
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Varen blev ikke oprettet");
      const created = data.created?.[0];
      setDone({
        title: finalTitle,
        url: created?.url ?? null,
        ean: code,
        quantity: qty,
        priceKr: price,
        boxNumber: created?.boxNumber ?? null,
        lagersalg: subcategory !== "screen_protector",
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Varen blev ikke oprettet");
    } finally {
      setBusy(null);
    }
  }

  const priceInvalid = priceText !== "" && Number(priceText) < 10;
  const missing = [
    priceInvalid && "pris (mindst 10 kr.)",
    isBag && !laptopSize && "størrelse",
    !isBag && models.length === 0 && "model",
    !isBag && models.length > 0 && !modelConfirmed && "bekræft model",
    !photo && "billede",
    !finalTitle && "titel",
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[20px] font-semibold leading-tight text-charcoal">Opret tilbehør</h1>
        <div className="flex gap-1.5">
          <Chip size="sm" selected={store === "vejle"} onToggle={() => setStore("vejle")}>Vejle</Chip>
          <Chip size="sm" selected={store === "slagelse"} onToggle={() => setStore("slagelse")}>Slagelse</Chip>
        </div>
      </div>

      <BoxBar store={store} onBoxChange={setOpenBox} />

      <input
        ref={readInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void identify(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* Stregkodescanner i fuld skærm, så kameraet ikke skæres af på telefonen. */}
      <div className={scanning ? "fixed inset-0 z-[100] flex flex-col bg-black" : "hidden"}>
        <p className="px-4 pb-2 pt-[max(16px,env(safe-area-inset-top))] text-center text-[15px] text-white/80">
          Hold stregkoden inden for rammen
        </p>
        <div className="flex flex-1 items-center justify-center overflow-hidden">
          <div id="quick-cover-scanner" className="w-full" />
        </div>
        <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={() => void stopCamera()}
            className="h-14 w-full rounded-xl bg-white text-[16px] font-semibold text-charcoal active:bg-cream"
          >
            Luk scanner
          </button>
        </div>
      </div>

      {error && <Notice tone="danger">{error}</Notice>}

      {step === "scan" && (
        <div className="space-y-4">
          {busy === "AI læser varen" ? (
            <Panel className="flex flex-col items-center gap-3 p-8 text-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-sand border-t-[#1A3D2E]" />
              <p className="text-[16px] font-semibold text-charcoal">AI læser varen</p>
              <p className="text-[13px] text-charcoal/60">Det tager 5-15 sekunder.</p>
            </Panel>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEan("");
                readInput.current?.click();
              }}
              className="flex w-full flex-col items-center gap-2 rounded-2xl bg-[#1A3D2E] px-6 py-10 text-white shadow-sm active:scale-[0.99]"
            >
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden>
                <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.6l1.2-1.8A1.5 1.5 0 0 1 9.5 3.5h5a1.5 1.5 0 0 1 1.2.7L16.9 6h1.6A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
                <circle cx="12" cy="12.5" r="3.5" />
              </svg>
              <span className="text-[18px] font-semibold">Tag billede af varen</span>
              <span className="text-[13px] text-white/75">AI læser pakken og udfylder resten</span>
            </button>
          )}

          <Button variant="secondary" className="h-12 w-full text-[15px]" onClick={() => void startCamera()} disabled={busy != null}>
            Har den stregkode? Scan den
          </Button>

          <details className="rounded-lg border border-sand bg-white px-4 py-3">
            <summary className="cursor-pointer text-[14px] text-charcoal/70">Skriv stregkode eller brug håndscanner</summary>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void lookup(ean);
              }}
            >
              <Input
                ref={eanRef}
                aria-label="Stregkode"
                autoComplete="off"
                autoCapitalize="characters"
                className="h-12"
                value={ean}
                onChange={(e) => setEan(e.target.value.replace(/[^A-Za-z0-9-]/g, ""))}
                placeholder="5701234567890"
              />
              <Button variant="primary" type="submit" loading={busy === "Slår stregkoden op"} className="h-12 shrink-0">Find</Button>
            </form>
          </details>
        </div>
      )}

      {step === "existing" && found && (
        <Panel className="space-y-4 p-4">
          <Notice tone="info">Den har du allerede oprettet. Skriv, hvor mange du lægger på lager.</Notice>
          <Field label="Antal">
            {(id) => <QtyStepper id={id} value={quantity} onChange={setQuantity} />}
          </Field>
          <MatchCard product={found} qty={qty} saleKr={saleKrFor(found)} busy={busy === `stock-${found.id}`} onAdd={(p) => void addStock(p)} />
          <Button variant="secondary" className="h-12 w-full" onClick={() => reset()}>Annuller</Button>
        </Panel>
      )}

      {step === "identify" && (
        <Panel className="space-y-4 p-4">
          <p className="text-[13px] text-charcoal/60">
            {ean ? (
              <>Ny stregkode <span className="font-mono text-charcoal">{ean}</span></>
            ) : (
              "Ingen stregkode. Systemet laver en, når varen gemmes."
            )}
          </p>
          <p className="text-[14px] text-charcoal">
            Tag et billede af pakkens forside, så modellen kan læses. Ligger varen løst, så fotografér selve varen.
          </p>
          <Button variant="primary" className="h-14 w-full text-[16px]" onClick={() => readInput.current?.click()} loading={busy === "AI læser varen"}>
            {busy === "AI læser varen" ? "AI læser varen" : "Tag billede"}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="h-12" onClick={() => reset()}>Annuller</Button>
            <Button variant="secondary" className="h-12" onClick={() => setStep("new")}>Udfyld selv</Button>
          </div>
        </Panel>
      )}

      {step === "match" && (
        <Panel className="space-y-4 p-4">
          <Notice tone="info">
            {candidates[0]?.score >= 10
              ? "Den har du allerede oprettet. Vil du lægge flere på lager?"
              : "Ligner en vare, du allerede har oprettet. Er det en af disse?"}
          </Notice>
          <Field label="Antal">
            {(id) => <QtyStepper id={id} value={quantity} onChange={setQuantity} />}
          </Field>
          {candidates.map((c) => (
            <MatchCard key={c.id} product={c} qty={qty} saleKr={saleKrFor(c)} busy={busy === `stock-${c.id}`} onAdd={(p) => void addStock(p)} />
          ))}
          <Button variant="secondary" className="h-12 w-full" onClick={() => setStep("new")}>Nej, det er en ny vare</Button>
        </Panel>
      )}

      {step === "new" && (
        <Panel className="space-y-5 p-4">
          {aiNote && <Notice tone="warning">{aiNote}</Notice>}
          <p className="text-[13px] text-charcoal/60">
            {ean ? <>Stregkode <span className="font-mono text-charcoal">{ean}</span></> : "Stregkode laves ved gem (print etiket bagefter)"}
            {identified?.readText ? <> · Læst: “{identified.readText.slice(0, 80)}”</> : null}
          </p>

          <Field label="Varetype">
            {() => (
              <div className="flex flex-wrap gap-2">
                {PRODUCT_TYPES.map((t) => (
                  <Chip
                    key={t.value}
                    selected={productType === t.value}
                    onToggle={() => {
                      setProductType(t.value);
                      if (identified && !titleTouched && t.value !== identified.productType) setTitle("");
                      if (t.value === "flip_cover") setCaseType("Flip");
                      if (t.value === "cover" && (caseType === "Flip" || caseType === "Wallet" || !caseType)) setCaseType("Slim");
                      if (t.value === "ipad_cover" && !caseType) setCaseType("Slim");
                      if (t.value === "screen_protector" || t.value === "bag" || productType === "bag") {
                        setPrice(defaultPriceFor(t.value));
                        setPriceText("");
                      }
                      // iPad-covers passer kun til iPads; tasker har ingen modeller, kun størrelse.
                      if (t.value === "ipad_cover") {
                        const ipads = models.filter((m) => m.startsWith("ipad-"));
                        if (ipads.length !== models.length) {
                          setModels(ipads);
                          setModelConfirmed(ipads.length > 0 && modelConfirmed);
                        }
                      }
                      if (t.value === "bag" && models.length > 0) {
                        setModels([]);
                        setModelConfirmed(false);
                      }
                    }}
                  >
                    {t.label}
                  </Chip>
                ))}
              </div>
            )}
          </Field>

          {isBag ? (
            <>
              <Field label="Størrelse" required>
                {() => (
                  <div className="flex flex-wrap gap-2">
                    {LAPTOP_SIZES.map((s) => (
                      <Chip key={s} selected={laptopSize === s} onToggle={() => setLaptopSize(laptopSize === s ? null : s)}>{s}</Chip>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="Type">
                {() => (
                  <div className="flex flex-wrap gap-2">
                    {BAG_TYPES.map((b) => (
                      <Chip key={b} selected={bagType === b} onToggle={() => setBagType(b)}>{b}</Chip>
                    ))}
                  </div>
                )}
              </Field>
            </>
          ) : (
          <Field label="Passer til" required>
            {() => (
              <div className="space-y-2">
                {identified && models.length > 0 && <AiHint />}
                {models.length > 0 && !modelConfirmed && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                    <span>AI er usikker på modellen ({models.map(labelOf).join(", ")}). Tjek den.</span>
                    <Button size="sm" variant="secondary" onClick={() => setModelConfirmed(true)}>Den er rigtig</Button>
                  </div>
                )}
                {identified?.unknownModelText && models.length === 0 && (
                  <p className="text-[13px] text-charcoal/60">AI læste “{identified.unknownModelText}”, som ikke er i listen. Vælg den nærmeste.</p>
                )}
                <ModelsPicker
                  key={productType === "ipad_cover" ? "ipad" : "alle"}
                  only={productType === "ipad_cover" ? isIpad : undefined}
                  selected={models}
                  onChange={(slugs) => {
                    setModels(slugs);
                    setModelConfirmed(slugs.length > 0);
                    // AI'ens tekst nævner den model, den læste; ved en anden model bruges skabelonen.
                    if (identified && aiTextIsStale(identified.models, slugs)) {
                      if (!titleTouched) setTitle("");
                      if (description === identified.descriptionDa) setDescription("");
                    }
                  }}
                />
              </div>
            )}
          </Field>
          )}

          {isCase && (
            <Field label="Covertype">
              {() => (
                <div className="flex flex-wrap gap-2">
                  {CASE_TYPES.map((t) => (
                    <Chip key={t.value} selected={caseType === t.value} onToggle={() => setCaseType(t.value)}>{t.label}</Chip>
                  ))}
                </div>
              )}
            </Field>
          )}

          {productType !== "screen_protector" && (
            <Field label="Farve">
              {() => (
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <Chip key={c} size="sm" selected={color === c} onToggle={() => setColor(color === c ? "" : c)}>{c}</Chip>
                  ))}
                </div>
              )}
            </Field>
          )}

          <Field label="Pris">
            {() => (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {priceChips.map((p) => (
                    <Chip
                      key={p}
                      selected={price === p}
                      onToggle={() => {
                        setPrice(p);
                        setPriceText("");
                      }}
                    >
                      {p} kr.
                    </Chip>
                  ))}
                  {!priceChips.includes(price) && (
                    <Chip selected onToggle={() => {}}>{price} kr.</Chip>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Anden pris"
                    inputMode="numeric"
                    className="h-12 w-32"
                    placeholder="Anden pris"
                    value={priceText}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 5);
                      setPriceText(v);
                      const n = Number(v);
                      if (n >= 10) setPrice(n);
                    }}
                  />
                  <span className="text-[14px] text-charcoal/60">kr.</span>
                </div>
              </div>
            )}
          </Field>

          <Field label="Titel" required>
            {(id) => (
              <div className="space-y-1">
                {identified && !titleTouched && title && <AiHint />}
                <Input
                  id={id}
                  value={titleTouched ? title : title || autoTitle}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTitleTouched(true);
                  }}
                  placeholder="Vælg model, så foreslås en titel"
                />
              </div>
            )}
          </Field>

          <Field label="Beskrivelse" hint="Kun det, der står på pakken eller kan ses.">
            {(id) => <Textarea id={id} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />}
          </Field>

          <Field label="Antal på lager">
            {(id) => <QtyStepper id={id} value={quantity} onChange={setQuantity} />}
          </Field>

          <Field label="Produktbillede" required hint="Tag varen ud af pakken og fotografér den lige forfra i lysboksen.">
            {() => (
              <PhotoPicker key={photoKey} name={`tilbehoer-${ean || Date.now()}`} onChange={setPhoto} />
            )}
          </Field>

          {liveCandidates.length > 0 && (
            <div className="space-y-3">
              <Notice tone="info">Ligner en vare, du allerede har oprettet. Er det en af disse?</Notice>
              {liveCandidates.map((c) => (
                <MatchCard key={c.id} product={c} qty={qty} saleKr={saleKrFor(c)} busy={busy === `stock-${c.id}`} onAdd={(p) => void addStock(p)} />
              ))}
            </div>
          )}

          {finalTitle && (
            <p className="rounded-lg bg-cream px-3 py-2 text-[14px] text-charcoal">
              {finalTitle} · <strong>{price} kr.</strong>
              {productType !== "screen_protector" && (openBox ? ` · lægges i ${boxLabel(openBox.number)}` : " · ingen åben kasse")}
            </p>
          )}

          <div className="sticky bottom-0 -mx-4 -mb-4 space-y-1.5 rounded-b-xl border-t border-sand bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
            {missing.length > 0 && <p className="text-[13px] text-charcoal/60">Mangler: {missing.join(", ")}</p>}
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <Button variant="secondary" className="h-12" onClick={() => reset()}>Annuller</Button>
              <Button
                variant="primary"
                className="h-12 text-[15px]"
                onClick={() => void createProduct()}
                disabled={missing.length > 0 || qty < 1}
                loading={busy === "Opretter vare"}
              >
                Gem vare{finalTitle ? ` · ${price} kr.` : ""}
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {step === "done" && done && (
        <Panel className="space-y-4 p-4">
          <Notice tone="success" title="Gemt">
            {done.title} · {done.quantity} på lager i {store === "vejle" ? "Vejle" : "Slagelse"}
            {done.boxNumber != null && <> · Lagt i {boxLabel(done.boxNumber)}</>}
          </Notice>
          {done.warnings.map((w) => (
            <Notice key={w} tone="warning">{w}</Notice>
          ))}
          {isValidEan13(done.ean) && (
            <div className="mx-auto w-56" aria-label={`Stregkode ${done.ean}`} dangerouslySetInnerHTML={{ __html: ean13Svg(done.ean) }} />
          )}
          <div className="grid grid-cols-2 gap-2">
            {isValidEan13(done.ean) && (
              <Button variant="secondary" className="h-12" onClick={() => printLabel(done.ean, done.title, done.priceKr, done.boxNumber, { lagersalg: done.lagersalg })}>Print etiket</Button>
            )}
            {done.url && (
              <Link href={done.url} target="_blank" className="flex h-12 items-center justify-center rounded-lg border border-sand text-[14px]">
                Se på webshoppen
              </Link>
            )}
          </div>
          <Button variant="primary" className="h-14 w-full text-[16px]" onClick={() => reset()}>Næste vare</Button>
          <button type="button" className="w-full text-[13px] text-charcoal/60 underline" onClick={() => reset(false)}>
            Nulstil type og pris
          </button>
        </Panel>
      )}
    </div>
  );
}

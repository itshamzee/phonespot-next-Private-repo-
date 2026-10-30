import { ean13Svg, isValidEan13 } from "@/lib/barcode/ean13";
import { boxLabel } from "@/lib/lagersalg/boxes";

/**
 * HTML til en 62 × 29 mm etiket: navn (højst to linjer) og pris, en linje med
 * returvilkår og kasse, og stregkoden nederst. Glas er aldrig lagersalg og får
 * derfor ingen returlinje (`lagersalg: false`).
 */
export function labelHtml(
  ean: string,
  title: string,
  priceKr: number,
  boxNumber: number | null,
  { lagersalg = true }: { lagersalg?: boolean } = {},
): string {
  // Escapes i stedet for at fjerne tegn, så tommetegn (14", iPad Pro 13") står på etiketten.
  const safeTitle = title.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const box = boxNumber != null ? `<span>${boxLabel(boxNumber)}</span>` : "";
  const terms = lagersalg || box ? `<div class="row terms"><span>${lagersalg ? "Lagersalg · ingen returret" : ""}</span>${box}</div>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: 62mm 29mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 62mm; height: 29mm; padding: 1.5mm 2.5mm; font-family: Arial, sans-serif; display: flex; flex-direction: column; justify-content: space-between; }
    .row { display: flex; justify-content: space-between; align-items: baseline; gap: 2mm; }
    .title { font-size: 8px; line-height: 1.15; max-height: 2.3em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .price { font-size: 13px; font-weight: 700; white-space: nowrap; }
    .terms { font-size: 7px; line-height: 1.1; }
    .terms span:last-child { font-weight: 700; }
    svg { width: 100%; height: 13mm; }
  </style></head><body>
    <div class="row"><div class="title">${safeTitle}</div><div class="price">${priceKr} kr.</div></div>
    ${terms}
    ${ean13Svg(ean)}
  </body></html>`;
}

/** Udskriver etiketten via en skjult iframe. */
export function printLabel(
  ean: string,
  title: string,
  priceKr: number,
  boxNumber: number | null,
  opts: { lagersalg?: boolean } = {},
) {
  if (!isValidEan13(ean)) return;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(labelHtml(ean, title, priceKr, boxNumber, opts));
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 150);
}

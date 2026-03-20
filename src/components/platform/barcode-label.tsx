"use client";

import { useRef, useCallback } from "react";
import { formatDKK } from "@/lib/platform/format";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface BarcodeLabelProps {
  barcode: string;
  modelName: string;
  grade: string;
  sellingPrice: number | null;
  storage: string | null;
  color: string | null;
}

interface BarcodeLabelDialogProps extends BarcodeLabelProps {
  open: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Grade badge colours (same palette as stock-table)                  */
/* ------------------------------------------------------------------ */

const GRADE_BADGE: Record<string, string> = {
  A: "bg-green-100 text-green-800 border-green-200",
  B: "bg-yellow-100 text-yellow-800 border-yellow-200",
  C: "bg-orange-100 text-orange-800 border-orange-200",
};

/* ------------------------------------------------------------------ */
/*  Print-only stylesheet injected into the iframe                     */
/* ------------------------------------------------------------------ */

const PRINT_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 62mm 29mm; margin: 0; }
  body {
    width: 62mm;
    height: 29mm;
    font-family: 'DM Sans', 'Barlow Condensed', Arial, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 1.5mm 2.5mm;
    overflow: hidden;
  }
  .barcode {
    font-family: 'Barlow Condensed', 'Courier New', monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-align: center;
    line-height: 1.1;
  }
  .model {
    font-size: 9px;
    font-weight: 600;
    text-align: center;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta {
    font-size: 8px;
    text-align: center;
    margin-top: 1px;
    color: #444;
  }
  .grade {
    display: inline-block;
    font-size: 8px;
    font-weight: 700;
    border: 0.5px solid #999;
    border-radius: 2px;
    padding: 0 2px;
  }
  .price {
    font-size: 10px;
    font-weight: 700;
    text-align: center;
    margin-top: 1px;
  }
`;

/* ------------------------------------------------------------------ */
/*  Label content (reused in preview + print)                          */
/* ------------------------------------------------------------------ */

function labelHTML(props: BarcodeLabelProps): string {
  const { barcode, modelName, grade, sellingPrice, storage, color } = props;

  const specs = [storage, color].filter(Boolean).join(" · ");
  const priceStr = sellingPrice !== null ? formatDKK(sellingPrice) : "";

  return `
    <div class="barcode">${barcode}</div>
    <div class="model">${modelName}</div>
    <div class="meta">
      <span class="grade">${grade}</span>${specs ? ` &nbsp;${specs}` : ""}
    </div>
    ${priceStr ? `<div class="price">${priceStr}</div>` : ""}
  `;
}

/* ------------------------------------------------------------------ */
/*  Exported dialog component                                          */
/* ------------------------------------------------------------------ */

export { labelHTML, PRINT_STYLES };
export type { BarcodeLabelProps };

export function BarcodeLabelDialog({
  open,
  onClose,
  ...labelProps
}: BarcodeLabelDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head><style>${PRINT_STYLES}</style></head>
        <body>${labelHTML(labelProps)}</body>
      </html>
    `);
    doc.close();

    // Small delay to let the iframe render before triggering print
    setTimeout(() => {
      iframe.contentWindow?.print();
    }, 200);
  }, [labelProps]);

  if (!open) return null;

  const specs = [labelProps.storage, labelProps.color]
    .filter(Boolean)
    .join(" · ");

  const gradeCls =
    GRADE_BADGE[labelProps.grade] ??
    "bg-stone-100 text-stone-700 border-stone-200";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h3 className="font-semibold text-stone-800">Print label</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center px-5 py-5">
          <div
            className="flex flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50"
            style={{ width: "248px", height: "116px" }}
          >
            <p className="font-barlow text-[17px] font-bold tracking-widest text-stone-900">
              {labelProps.barcode}
            </p>
            <p className="mt-0.5 max-w-[220px] truncate text-[12px] font-semibold text-stone-800">
              {labelProps.modelName}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-stone-500">
              <span
                className={`inline-block rounded border px-1 text-[10px] font-bold ${gradeCls}`}
              >
                {labelProps.grade}
              </span>
              {specs && <span>{specs}</span>}
            </p>
            {labelProps.sellingPrice !== null && (
              <p className="mt-0.5 text-[13px] font-bold text-stone-900">
                {formatDKK(labelProps.sellingPrice)}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-stone-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-stone-200 px-4 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Annuller
          </button>
          <button
            onClick={handlePrint}
            className="rounded-lg bg-stone-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-700"
          >
            Print
          </button>
        </div>
      </div>

      {/* Hidden iframe used for printing */}
      <iframe
        ref={iframeRef}
        className="fixed left-[-9999px] top-[-9999px] h-0 w-0"
        title="barcode-label-print"
      />
    </div>
  );
}

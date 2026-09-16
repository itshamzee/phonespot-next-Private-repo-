"use client";

import { formatOere } from "./money";

export interface PreviewData {
  title: string;
  brand?: string | null;
  price: number | null;
  salePrice?: number | null;
  image?: string | null;
  categoryLabel?: string;
  modelsLabel?: string;
  status: "published" | "draft";
  alwaysInStock: boolean;
  stockTotal: number;
}

export interface ReadinessCheck {
  label: string;
  ok: boolean;
  /** Hvis ikke ok: hvad der mangler. */
  fix?: string;
}

/**
 * Viser produktet som det kommer til at se ud i webshoppens produktgrid, og en
 * tjekliste over hvad der skal til, før det er synligt og kan købes.
 * Det er hele pointen med flowet: webshoppen først.
 */
export function WebshopPreview({ data, checks }: { data: PreviewData; checks: ReadinessCheck[] }) {
  const missing = checks.filter((c) => !c.ok);
  const ready = missing.length === 0;
  const onSale = data.salePrice != null && data.price != null && data.salePrice < data.price;

  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-xl border border-sand bg-white p-4">
        <p className="mb-3 text-[13px] text-gray">Sådan ser det ud på webshoppen</p>
        <div className="mx-auto max-w-[240px]">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-cream">
            {data.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.image} alt="" className="h-full w-full object-contain p-3" />
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-gray">Intet billede</div>
            )}
            {onSale && (
              <span className="absolute left-2 top-2 rounded-full bg-green-eco px-2 py-0.5 text-[11px] font-medium text-white">Tilbud</span>
            )}
          </div>
          <div className="mt-3">
            {data.brand && <p className="text-[12px] text-gray">{data.brand}</p>}
            <p className="line-clamp-2 text-[14px] font-medium leading-snug text-charcoal">
              {data.title || "Produktets navn"}
            </p>
            {data.modelsLabel && <p className="mt-0.5 text-[12px] text-gray">{data.modelsLabel}</p>}
            <p className="mt-1.5 text-[15px] font-semibold tabular-nums text-charcoal">
              {onSale ? (
                <>
                  {formatOere(data.salePrice)}{" "}
                  <span className="text-[13px] font-normal text-gray line-through">{formatOere(data.price)}</span>
                </>
              ) : (
                formatOere(data.price) || "0 kr."
              )}
            </p>
            <p className="mt-1 text-[12px] text-gray">
              {data.alwaysInStock ? "Bestillingsvare" : data.stockTotal > 0 ? `${data.stockTotal} på lager` : "Udsolgt"}
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-4 ${ready ? "border-[#CFE3D6] bg-green-pale" : "border-sand bg-white"}`}>
        <p className={`text-[14px] font-semibold ${ready ? "text-green-eco" : "text-charcoal"}`}>
          {ready
            ? data.status === "published"
              ? "Klar til webshoppen"
              : "Klar, gemmes som kladde"
            : `${missing.length} ${missing.length === 1 ? "ting mangler" : "ting mangler"}`}
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-[13px]">
              <span
                aria-hidden
                className={`mt-[3px] inline-block h-3.5 w-3.5 shrink-0 rounded-full border ${
                  c.ok ? "border-green-eco bg-green-eco" : "border-sand bg-white"
                }`}
              />
              <span className={c.ok ? "text-gray" : "text-charcoal"}>
                {c.label}
                {!c.ok && c.fix && <span className="text-gray"> – {c.fix}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

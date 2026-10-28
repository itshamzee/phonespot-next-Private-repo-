"use client";

import { Button } from "@/components/admin/ui";

export interface MatchProduct {
  id: string;
  title: string;
  images: string[] | null;
  selling_price: number;
  status: string;
  subcategory?: string | null;
  stock: Record<string, number>;
}

/** Knaptekst efter varens status: kladder udgives, publicerede varer får kun lager. */
export function matchActionLabel(p: MatchProduct, qty: number, saleKr: number): string {
  if (p.status === "draft") {
    return p.subcategory === "cover" ? `Sæt på udsalg til ${saleKr} kr. og læg ${qty || ""} på lager` : `Udgiv og læg ${qty || ""} på lager`;
  }
  return `Læg ${qty || ""} på lager`;
}

/** "Den har du allerede oprettet": én eksisterende vare med billede, pris og lager. */
export function MatchCard({
  product,
  qty,
  saleKr,
  busy,
  onAdd,
}: {
  product: MatchProduct;
  qty: number;
  saleKr: number;
  busy: boolean;
  onAdd: (product: MatchProduct) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-sand p-3">
      <div className="flex items-center gap-3">
        {product.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-cream object-contain" />
        ) : (
          <div className="h-16 w-16 shrink-0 rounded-lg bg-cream" />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-charcoal">{product.title}</p>
          <p className="text-[13px] text-charcoal/60">
            {(product.selling_price / 100).toLocaleString("da-DK")} kr.
            {product.status === "draft" ? " · kladde" : ""} · Vejle {product.stock.vejle ?? 0} · Slagelse {product.stock.slagelse ?? 0}
          </p>
        </div>
      </div>
      <Button variant="primary" className="w-full" onClick={() => onAdd(product)} disabled={qty < 1} loading={busy}>
        {matchActionLabel(product, qty, saleKr)}
      </Button>
    </div>
  );
}

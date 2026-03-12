"use client";

import type { CartItem, CartDeviceItem, CartSkuItem } from "@/lib/cart/types";
import { cartItemKey } from "@/lib/cart/types";
import { useCart } from "@/components/cart/cart-context";
import { formatOere, lineTotal } from "@/lib/cart/utils";

// ---------------------------------------------------------------------------
// Grade badge colours
// ---------------------------------------------------------------------------

const GRADE_STYLES: Record<"A" | "B" | "C", string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-amber-100 text-amber-800",
  C: "bg-orange-100 text-orange-800",
};

// ---------------------------------------------------------------------------
// Shared thumbnail
// ---------------------------------------------------------------------------

function ItemThumbnail({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-cream">
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-gray">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="h-8 w-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Remove button
// ---------------------------------------------------------------------------

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex-shrink-0 self-start text-gray transition-colors hover:text-charcoal"
      onClick={onClick}
      aria-label="Fjern fra kurv"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18 18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Device line item
// ---------------------------------------------------------------------------

function DeviceLineItem({ item }: { item: CartDeviceItem }) {
  const { removeItem } = useCart();
  const key = cartItemKey(item);

  return (
    <div className="flex gap-4 py-4">
      <ItemThumbnail src={item.image} alt={item.title} />

      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h4 className="text-sm font-medium text-charcoal leading-tight">{item.title}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {/* Grade badge */}
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${GRADE_STYLES[item.grade]}`}
            >
              Stand {item.grade}
            </span>
            {item.color && (
              <span className="text-xs text-gray">{item.color}</span>
            )}
            {item.storage && (
              <span className="text-xs text-gray">{item.storage}</span>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray">1 stk.</span>
          <span className="text-sm font-semibold text-charcoal">
            {formatOere(lineTotal(item))}
          </span>
        </div>
      </div>

      <RemoveButton onClick={() => removeItem(key)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SKU line item
// ---------------------------------------------------------------------------

function SkuLineItem({ item }: { item: CartSkuItem }) {
  const { removeItem, updateSkuQuantity } = useCart();
  const key = cartItemKey(item);

  function handleQtyChange(newQty: number) {
    if (newQty <= 0) {
      removeItem(key);
    } else {
      updateSkuQuantity(item.skuProductId, newQty);
    }
  }

  return (
    <div className="flex gap-4 py-4">
      <ItemThumbnail src={item.image} alt={item.title} />

      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h4 className="text-sm font-medium text-charcoal leading-tight">{item.title}</h4>
        </div>

        <div className="flex items-center justify-between mt-2">
          {/* Quantity selector */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-sand text-charcoal transition-colors hover:bg-cream"
              onClick={() => handleQtyChange(item.quantity - 1)}
              aria-label="Fjern en"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3 w-3"
              >
                <path
                  fillRule="evenodd"
                  d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <span className="w-6 text-center text-sm font-medium text-charcoal">
              {item.quantity}
            </span>

            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-sand text-charcoal transition-colors hover:bg-cream"
              onClick={() => handleQtyChange(Math.min(10, item.quantity + 1))}
              aria-label="Tilføj en"
              disabled={item.quantity >= 10}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3 w-3"
              >
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
            </button>
          </div>

          {/* Line total */}
          <span className="text-sm font-semibold text-charcoal">
            {formatOere(lineTotal(item))}
          </span>
        </div>
      </div>

      <RemoveButton onClick={() => removeItem(key)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export — dispatches to correct sub-component by item type
// ---------------------------------------------------------------------------

export function CartLineItem({ item }: { item: CartItem }) {
  if (item.type === "device") {
    return <DeviceLineItem item={item} />;
  }
  return <SkuLineItem item={item} />;
}

"use client";

import { useTransition } from "react";
import type { CartItem } from "@/lib/shopify/types";
import { useCart } from "@/components/cart/cart-context";
import { updateCartLine, removeFromCart } from "@/lib/shopify/client";

function formatPrice(amount: string, currencyCode = "DKK"): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
  }).format(parseFloat(amount));
}

export function CartLineItem({ item }: { item: CartItem }) {
  const { cart, setCart } = useCart();
  const [isPending, startTransition] = useTransition();

  const { merchandise } = item;
  const image = merchandise.product.featuredImage;

  const selectedOptions = merchandise.selectedOptions
    .filter((opt) => opt.value !== "Default Title")
    .map((opt) => opt.value)
    .join(" / ");

  function handleUpdateQuantity(newQuantity: number) {
    if (!cart) return;

    startTransition(async () => {
      if (newQuantity <= 0) {
        const updatedCart = await removeFromCart(cart.id, [item.id]);
        setCart(updatedCart);
      } else {
        const updatedCart = await updateCartLine(cart.id, item.id, newQuantity);
        setCart(updatedCart);
      }
    });
  }

  function handleRemove() {
    if (!cart) return;

    startTransition(async () => {
      const updatedCart = await removeFromCart(cart.id, [item.id]);
      setCart(updatedCart);
    });
  }

  return (
    <div
      className={`flex gap-4 py-4 ${isPending ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Thumbnail */}
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-cream">
        {image ? (
          <img
            src={image.url}
            alt={image.altText ?? merchandise.product.title}
            className="h-full w-full object-cover"
          />
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

      {/* Details */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h4 className="text-sm font-medium text-charcoal leading-tight">
            {merchandise.product.title}
          </h4>
          {selectedOptions && (
            <p className="mt-0.5 text-xs text-gray">{selectedOptions}</p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          {/* Quantity controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-sand text-charcoal transition-colors hover:bg-cream"
              onClick={() => handleUpdateQuantity(item.quantity - 1)}
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
              onClick={() => handleUpdateQuantity(item.quantity + 1)}
              aria-label="Tilføj en"
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

          {/* Price */}
          <span className="text-sm font-semibold text-charcoal">
            {formatPrice(
              item.cost.totalAmount.amount,
              item.cost.totalAmount.currencyCode,
            )}
          </span>
        </div>
      </div>

      {/* Remove button */}
      <button
        type="button"
        className="flex-shrink-0 self-start text-gray transition-colors hover:text-charcoal"
        onClick={handleRemove}
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
    </div>
  );
}

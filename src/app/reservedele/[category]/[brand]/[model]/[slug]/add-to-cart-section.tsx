"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { ColorVariantPicker } from "@/components/spare-parts/color-variant-picker";

interface ColorVariant {
  color_name: string;
  color_hex: string;
  sku: string | null;
  price_dkk: number | null;
  stock: number;
  image_url: string | null;
}

interface ProductData {
  id: string;
  title: string;
  images: string[];
  selling_price: number;
  sale_price: number | null;
  is_inquiry_only: boolean;
  color_variants: ColorVariant[];
}

interface AddToCartSectionProps {
  product: ProductData;
  warrantyMonths: number;
  withColorPicker: boolean;
}

export function AddToCartSection({
  product,
  warrantyMonths,
  withColorPicker,
}: AddToCartSectionProps) {
  const { addSku, openCart } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ColorVariant | null>(
    withColorPicker && product.color_variants.length > 0
      ? product.color_variants[0]
      : null,
  );

  // Determine effective price (variant price overrides base price)
  const basePrice = product.sale_price ?? product.selling_price;
  const effectivePrice =
    selectedVariant?.price_dkk != null ? selectedVariant.price_dkk : basePrice;

  function handleAddToCart() {
    addSku({
      type: "sku_product",
      skuProductId: product.id,
      title: product.title,
      image: product.images[0] ?? null,
      price: effectivePrice,
      quantity: qty,
      variantLabel: selectedVariant ? `Farve: ${selectedVariant.color_name}` : undefined,
    });
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Color variant picker */}
      {withColorPicker && product.color_variants.length > 0 && (
        <ColorVariantPicker
          variants={product.color_variants}
          basePrice={product.sale_price ?? product.selling_price}
          onSelect={(variant) => setSelectedVariant(variant)}
        />
      )}

      {/* Price display */}
      <div className="flex items-baseline gap-3">
        <span className="font-display text-3xl font-bold text-[#111111]">
          {(effectivePrice / 100).toLocaleString("da-DK")} kr
        </span>
        {product.sale_price !== null && selectedVariant?.price_dkk == null && (
          <span className="text-base text-[#86868B] line-through">
            {(product.selling_price / 100).toLocaleString("da-DK")} kr
          </span>
        )}
      </div>

      {/* Inquiry only path */}
      {product.is_inquiry_only ? (
        <a
          href="/kontakt"
          className="flex w-full items-center justify-center rounded-xl border-2 border-[#1A3D2E] px-6 py-4 text-sm font-semibold text-[#1A3D2E] transition-colors hover:bg-[#1A3D2E] hover:text-white"
        >
          Forespørg pris
        </a>
      ) : (
        /* Quantity + add to cart */
        <div className="flex items-stretch gap-3">
          {/* Quantity stepper */}
          <div className="flex items-center rounded-xl border border-[#E5E5EA] bg-[#F7F7F8]">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Mindsk antal"
              className="flex h-12 w-11 items-center justify-center rounded-l-xl text-[#86868B] transition-colors hover:bg-[#E5E5EA] hover:text-[#111111]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            </button>
            <span className="min-w-[36px] text-center text-sm font-semibold text-[#111111]">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Forøg antal"
              className="flex h-12 w-11 items-center justify-center rounded-r-xl text-[#86868B] transition-colors hover:bg-[#E5E5EA] hover:text-[#111111]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </button>
          </div>

          {/* Add to cart button */}
          <button
            type="button"
            onClick={handleAddToCart}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-semibold transition-all ${
              added
                ? "bg-green-600 text-white"
                : "bg-[#1A3D2E] text-white hover:bg-[#1A3D2E]/90 active:scale-[0.98]"
            }`}
          >
            {added ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Lagt i kurv
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                  />
                </svg>
                Læg i kurv
              </>
            )}
          </button>
        </div>
      )}

      {/* Trust micro-copy */}
      <p className="text-xs text-[#86868B]">
        Inkl. {warrantyMonths} {warrantyMonths === 1 ? "måneds" : "måneders"} garanti &middot; Gratis fragt over 500 kr &middot; 14 dages returret
      </p>
    </div>
  );
}

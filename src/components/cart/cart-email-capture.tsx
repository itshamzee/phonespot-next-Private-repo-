"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/cart-context";

// ---------------------------------------------------------------------------
// CartEmailCapture
//
// Shown inside the cart drawer when the user has items but has not entered
// their email yet. Saves email + cart snapshot to `cart_captures` via the
// API so we can send a recovery email later if the customer never checks out.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "ps_cart_capture_email";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function CartEmailCapture() {
  const { cartState } = useCart();

  // Determine whether we already captured an email in this browser session.
  const [captured, setCaptured] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Do not render if cart is empty or email is already captured.
  if (cartState.items.length === 0 || captured) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Indtast en gyldig e-mailadresse");
      return;
    }

    setSubmitting(true);
    try {
      const items = cartState.items.map((item) => {
        if (item.type === "device") {
          return {
            type: "device" as const,
            deviceId: item.deviceId,
            title: item.title,
            price: item.price,
            image: item.image ?? null,
          };
        }
        return {
          type: "sku_product" as const,
          skuProductId: item.skuProductId,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          image: item.image ?? null,
        };
      });

      const res = await fetch("/api/cart/capture-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, items }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Noget gik galt");
      }

      // Persist so the widget does not show again after page reload.
      try {
        localStorage.setItem(STORAGE_KEY, trimmed);
      } catch {
        // localStorage not available — no-op
      }
      setCaptured(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noget gik galt. Prøv igen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-[#E5E5EA] px-5 py-4">
      <p className="mb-2 text-xs font-medium text-[#86868B]">
        Gem din kurv — vi sender dig en påmindelse
      </p>
      <form onSubmit={handleSubmit} noValidate className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="din@email.dk"
          disabled={submitting}
          aria-label="E-mailadresse til kurv-påmindelse"
          className="min-w-0 flex-1 rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-sm text-[#111111] placeholder-[#AEAEB2] outline-none focus:border-[#1A3D2E] focus:ring-1 focus:ring-[#1A3D2E] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting}
          className="shrink-0 rounded-lg bg-[#1A3D2E] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Gemmer..." : "Gem"}
        </button>
      </form>
      {error && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

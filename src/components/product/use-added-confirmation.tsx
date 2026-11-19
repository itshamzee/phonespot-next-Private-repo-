"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Short "Lagt i kurven" confirmation for an add-to-cart button.
 *
 * `confirm()` marks the current `key` (product or variant) as just added for
 * `ms` milliseconds. Choosing another variant ends the confirmation at once,
 * so the label always describes what the button will add next. Purely
 * presentational: it never disables the button or touches the cart.
 */
export function useAddedConfirmation(key: string, ms = 1500) {
  const [addedKey, setAddedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const confirm = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setAddedKey(key);
    timer.current = setTimeout(() => setAddedKey(null), ms);
  }, [key, ms]);

  return [addedKey === key, confirm] as const;
}

/** Check mark used inside the confirmation label. */
export function AddedCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  );
}

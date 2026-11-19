"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/admin/ui";

export interface UndoItem {
  key: number;
  message: string;
  onUndo: () => void;
}

const SECONDS = 10;

/**
 * Besked med "Fortryd" i 10 sekunder (Færdig og Udsæt). Admin-toasten kan ikke
 * have knapper, så denne bor i Kundecenteret med samme udtryk. Kun beskeden
 * læses op; nedtællingen på knappen gør ikke.
 */
export function UndoToast({ item, onDismiss }: { item: UndoItem | null; onDismiss: () => void }) {
  const [left, setLeft] = useState(SECONDS);

  useEffect(() => {
    if (!item) return;
    setLeft(SECONDS);
    const started = Date.now();
    const t = setInterval(() => {
      const rest = SECONDS - Math.floor((Date.now() - started) / 1000);
      if (rest <= 0) {
        clearInterval(t);
        onDismiss();
      } else {
        setLeft(rest);
      }
    }, 250);
    return () => clearInterval(t);
    // Ny besked = nyt nøgletal; onDismiss er stabil nok til at blive udeladt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.key]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-[65] flex justify-center px-4">
      <div
        data-open={Boolean(item)}
        aria-hidden={item ? undefined : true}
        className="m-toast flex max-w-[min(480px,100%)] items-center gap-3.5 rounded-[10px] bg-[#15211B] py-2.5 pl-4 pr-3 text-[14px] text-white"
      >
        <span role="status" aria-live="polite">
          {item?.message ?? ""}
        </span>
        {item && (
          <Button
            size="sm"
            className="tabular-nums"
            onClick={() => {
              item.onUndo();
              onDismiss();
            }}
          >
            Fortryd ({left})
          </Button>
        )}
      </div>
    </div>
  );
}

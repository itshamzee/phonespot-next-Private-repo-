"use client";

import { useState } from "react";
import Link from "next/link";
import type { ScopeSlug } from "@/lib/auth/store-scope";
import { GoodsReceiptDialog } from "./goods-receipt-dialog";

/** Sidehoved for Varer: titel og de to hovedhandlinger. */
export function VarerHeader({
  title = "Varer",
  canReceive,
  isOwner,
  defaultLocation,
}: {
  title?: string;
  canReceive: boolean;
  isOwner: boolean;
  defaultLocation: ScopeSlug;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.02em]">{title}</h1>
      <div className="flex flex-wrap gap-2.5">
        {canReceive && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-[42px] items-center rounded-lg border border-[#C9D0C7] bg-white px-4 text-[15px] font-semibold text-[#15211B] hover:bg-[#F5F6F4]"
          >
            Modtag varer
          </button>
        )}
        <Link
          href="/admin/produkter/ny"
          className="flex h-[42px] items-center rounded-lg bg-[#1A3D2E] px-[18px] text-[15px] font-semibold text-white hover:bg-[#2D6B45]"
        >
          Ny vare
        </Link>
      </div>
      {canReceive && open && (
        <GoodsReceiptDialog onClose={() => setOpen(false)} defaultLocation={defaultLocation} lockLocation={!isOwner} />
      )}
    </div>
  );
}

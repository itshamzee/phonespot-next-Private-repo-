"use client";

import { use } from "react";
import { ReceiptDetail } from "../_components/receipt-detail";

export default function ReceiptDetailPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = use(params);
  return <ReceiptDetail receiptId={receiptId} />;
}

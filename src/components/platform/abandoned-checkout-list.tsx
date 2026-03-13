"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDKK, formatDate } from "@/lib/platform/format";

type RecoveryStatus = "none" | "email_sent" | "sms_sent" | "both_sent" | "recovered";

interface AbandonedOrder {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  recovery_status: RecoveryStatus;
  recovery_token: string | null;
  customer: { name: string | null; email: string | null } | null;
  order_items: { id: string }[];
}

const STATUS_LABELS: Record<RecoveryStatus, string> = {
  none: "Ingen kontakt",
  email_sent: "Email sendt",
  sms_sent: "SMS sendt",
  both_sent: "Email + SMS",
  recovered: "Genoptaget",
};

const STATUS_CLASSES: Record<RecoveryStatus, string> = {
  none: "bg-stone-100 text-stone-600",
  email_sent: "bg-blue-100 text-blue-700",
  sms_sent: "bg-amber-100 text-amber-700",
  both_sent: "bg-purple-100 text-purple-700",
  recovered: "bg-green-100 text-green-700",
};

function RecoveryBadge({ status }: { status: RecoveryStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status] ?? STATUS_CLASSES.none}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function AbandonedCheckoutList() {
  const [orders, setOrders] = useState<AbandonedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shipping/orders?status=abandoned&per_page=100");
      if (!res.ok) throw new Error("Kunne ikke hente forladt checkout-ordrer");
      const json = await res.json();
      const raw = Array.isArray(json.orders) ? json.orders : [];
      // Normalise customer join
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalised = raw.map((row: any) => ({
        ...row,
        customer: Array.isArray(row.customer)
          ? (row.customer[0] ?? null)
          : (row.customer ?? null),
        order_items: Array.isArray(row.order_items) ? row.order_items : [],
      }));
      setOrders(normalised);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function handleSendReminder(orderId: string) {
    setSendingId(orderId);
    try {
      const res = await fetch(`/api/platform/abandoned-checkout/${orderId}/send-reminder`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Fejl ved afsendelse");
      }
      showToast("Påmindelse sendt", "success");
      await fetchOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Fejl ved afsendelse", "error");
    } finally {
      setSendingId(null);
    }
  }

  function handleCopyRecoveryLink(order: AbandonedOrder) {
    if (!order.recovery_token) {
      showToast("Ingen recovery-token på denne ordre", "error");
      return;
    }
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://phonespot.dk";
    const link = `${baseUrl}/checkout/recover/${order.recovery_token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(order.id);
      showToast("Link kopieret", "success");
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-stone-400 text-sm">
        Henter forladt checkout...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-400">
        Ingen forladt checkout-ordrer fundet.
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
              <th className="px-4 py-3 text-left">Ordre</th>
              <th className="px-4 py-3 text-left">Dato</th>
              <th className="px-4 py-3 text-left">Kunde</th>
              <th className="px-4 py-3 text-center">Varer</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Handlinger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {orders.map((order) => {
              const itemCount = Array.isArray(order.order_items)
                ? order.order_items.length
                : 0;
              const customer = order.customer;
              const recoveryStatus: RecoveryStatus =
                (order.recovery_status as RecoveryStatus) ?? "none";

              return (
                <tr
                  key={order.id}
                  className="hover:bg-stone-50/60 transition-colors"
                >
                  {/* Order number */}
                  <td className="px-4 py-3 font-mono font-semibold text-stone-700">
                    #{order.order_number}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-stone-500">
                    {formatDate(order.created_at)}
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3">
                    {customer ? (
                      <div>
                        {customer.name && (
                          <div className="font-medium text-stone-700">{customer.name}</div>
                        )}
                        {customer.email && (
                          <div className="text-xs text-stone-400">{customer.email}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>

                  {/* Item count */}
                  <td className="px-4 py-3 text-center text-stone-600">{itemCount}</td>

                  {/* Total */}
                  <td className="px-4 py-3 text-right font-semibold text-stone-700">
                    {formatDKK(order.total ?? 0)}
                  </td>

                  {/* Recovery status */}
                  <td className="px-4 py-3">
                    <RecoveryBadge status={recoveryStatus} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSendReminder(order.id)}
                        disabled={
                          sendingId === order.id ||
                          recoveryStatus === "recovered"
                        }
                        className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                        title="Send påmindelsesemail"
                      >
                        {sendingId === order.id ? "Sender..." : "Send påmindelse"}
                      </button>
                      <button
                        onClick={() => handleCopyRecoveryLink(order)}
                        disabled={!order.recovery_token}
                        className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                        title="Kopier recovery-link til clipboard"
                      >
                        {copiedId === order.id ? "Kopieret!" : "Kopier link"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

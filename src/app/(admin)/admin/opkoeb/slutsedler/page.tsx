"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, DataTable, Field, Notice, PageHeader, Select, type Column } from "@/components/admin/ui";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import { apiErrorMessage, receiptHref, StatusTag, STATUS_LABELS, SuspicionTag } from "./_components/receipt-status";
import { formatKr } from "./_components/receipt-form";
import { useStaffNames, useStores } from "./_components/use-receipt-lookups";

type Row = {
  id: string;
  receipt_number: string | null;
  status: string;
  total_amount: number | null;
  location_id: string | null;
  seller_name: string | null;
  seller_type: string | null;
  created_at: string;
  created_by: string | null;
  suspected_at?: string | null;
  has_signed_scan: boolean;
  has_invoice: boolean;
  item_count?: number;
};

const LIMIT = 100;

/** Bekræftet eller udbetalt, men uden den fil, der skal ligge på sedlen. */
const missingScan = (r: Row) =>
  (r.status === "confirmed" || r.status === "paid") && (r.seller_type === "business" ? !r.has_invoice : !r.has_signed_scan);

const date = (iso: string) => new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Copenhagen" });

export default function ReceiptsPage() {
  const router = useRouter();
  const { stores } = useStores();
  const staffName = useStaffNames();
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ limit: String(LIMIT) });
    if (location) qs.set("location_id", location);
    if (status) qs.set("status", status);
    (async () => {
      try {
        const res = await staffFetch(`/api/trade-in/receipts?${qs.toString()}`);
        if (!res.ok) throw new Error(await apiErrorMessage(res, "Slutsedlerne kunne ikke hentes"));
        const data = (await res.json()) as Row[];
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Slutsedlerne kunne ikke hentes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location, status]);

  const shown = useMemo(() => (onlyMissing ? rows.filter(missingScan) : rows), [rows, onlyMissing]);
  const storeName = (id: string | null) => stores.find((s) => s.id === id)?.name ?? "–";

  const columns: Column<Row>[] = [
    {
      key: "number",
      header: "Nummer",
      render: (r) => (
        <Link href={receiptHref(r.id)} className="font-medium text-green-eco underline-offset-2 hover:underline" onClick={(e) => e.stopPropagation()}>
          {r.receipt_number ?? "Kladde"}
        </Link>
      ),
    },
    { key: "date", header: "Dato", render: (r) => date(r.created_at) },
    { key: "store", header: "Butik", hideBelow: "sm", render: (r) => storeName(r.location_id) },
    { key: "seller", header: "Sælger", render: (r) => r.seller_name || "–" },
    { key: "items", header: "Enheder", align: "right", hideBelow: "md", render: (r) => r.item_count ?? "–" },
    { key: "total", header: "Total", align: "right", render: (r) => formatKr(r.total_amount ?? 0) },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span className="flex flex-wrap items-center gap-1">
          <StatusTag status={r.status} />
          {r.suspected_at && <SuspicionTag />}
          {missingScan(r) && <span className="text-[12px] text-[#8A4B08]">Mangler {r.seller_type === "business" ? "faktura" : "scan"}</span>}
        </span>
      ),
    },
    { key: "staff", header: "Medarbejder", hideBelow: "lg", render: (r) => staffName(r.created_by) },
  ];

  return (
    <>
      <PageHeader
        title="Slutsedler"
        description="Opkøb fra disken. Åbn en seddel for at printe, lægge den underskrevne seddel op eller markere udbetaling."
        backHref="/admin/opkoeb"
        backLabel="Opkøb"
        actions={
          <Link
            href="/admin/opkoeb/slutsedler/ny"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-green-eco px-4 text-[14px] font-medium text-white transition-colors hover:bg-green-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-light focus-visible:ring-offset-2"
          >
            Nyt opkøb
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        {stores.length > 1 && (
          <Field label="Butik" className="w-[180px]">
            {(id) => (
              <Select id={id} value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="">Alle butikker</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Status" className="w-[180px]">
          {(id) => (
            <Select id={id} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Alle</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Button variant={onlyMissing ? "primary" : "secondary"} aria-pressed={onlyMissing} onClick={() => setOnlyMissing((v) => !v)}>
          Mangler scan
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={shown}
        rowKey={(r) => r.id}
        loading={loading}
        onRowClick={(r) => router.push(receiptHref(r.id))}
        empty={{
          title: onlyMissing ? "Ingen sedler mangler scan" : "Ingen slutsedler",
          description: onlyMissing ? "Alle bekræftede sedler i listen har deres fil." : "Opkøb fra disken dukker op her, når de er oprettet.",
        }}
      />
      {rows.length >= LIMIT && <p className="mt-3 text-[13px] text-gray">Viser de seneste {LIMIT}. Brug filtrene for at indsnævre.</p>}
    </>
  );
}

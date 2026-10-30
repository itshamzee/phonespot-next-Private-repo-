"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BoxBar } from "@/components/admin/products/quick-intake/box-bar";
import { useStoreScope } from "@/components/admin/shell/store-scope-context";
import { Button, DataTable, Notice, PageHeader, Segmented, Tag, type Column } from "@/components/admin/ui";
import { boxLabel, type SaleBox } from "@/lib/lagersalg/boxes";

type Store = "vejle" | "slagelse";
interface Row {
  id: string;
  number: number;
  status: "open" | "closed";
  lines: number;
  units: number;
}

export default function KasserPage() {
  const { loading: scopeLoading, ownSlug } = useStoreScope();
  // Butiksmedarbejdere starter i egen butik; ejeren (ingen egen butik) starter i Vejle.
  const [store, setStore] = useState<Store>("vejle");
  const [storeReady, setStoreReady] = useState(false);
  useEffect(() => {
    if (scopeLoading || storeReady) return;
    if (ownSlug === "vejle" || ownSlug === "slagelse") setStore(ownSlug);
    setStoreReady(true);
  }, [scopeLoading, ownSlug, storeReady]);
  const [rows, setRows] = useState<Row[]>([]);
  const [unboxed, setUnboxed] = useState(0);
  const [open, setOpen] = useState<SaleBox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const run = ++seq.current;
    try {
      const res = await fetch(`/api/admin/lagersalg/boxes/overview?store=${store}`);
      const data = await res.json();
      if (run !== seq.current) return;
      if (!res.ok) throw new Error(data?.error ?? "Kasserne kunne ikke hentes. Prøv igen.");
      setRows(data.boxes ?? []);
      setUnboxed(data.unboxed ?? 0);
      setError(null);
    } catch (err) {
      if (run === seq.current) setError(err instanceof Error ? err.message : "Kasserne kunne ikke hentes. Prøv igen.");
    } finally {
      if (run === seq.current) setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    if (!storeReady) return;
    setLoading(true);
    setConfirming(false);
    setDone(null);
    void load();
  }, [load, storeReady]);

  async function assign() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/lagersalg/boxes/assign-unboxed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ store }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Varerne kunne ikke lægges i kassen. Prøv igen.");
      setDone(`${data.assigned} varer lagt i ${boxLabel(data.box.number)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Varerne kunne ikke lægges i kassen. Prøv igen.");
    } finally {
      setConfirming(false);
      setBusy(false);
      void load();
    }
  }

  const columns: Column<Row>[] = [
    { key: "box", header: "Kasse", render: (r) => <span className="font-medium text-charcoal">{boxLabel(r.number)}</span> },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <Tag tone={r.status === "open" ? "green" : "neutral"}>{r.status === "open" ? "Åben" : "Lukket"}</Tag>
          {r.units === 0 && <Tag>tom</Tag>}
        </span>
      ),
    },
    { key: "lines", header: "Varer", align: "right", render: (r) => r.lines },
    { key: "units", header: "Stk.", align: "right", render: (r) => r.units },
  ];

  const canAssign = unboxed > 0 && open != null;

  return (
    <div className="mx-auto max-w-[900px] space-y-4">
      <PageHeader title="Kasser" description="Lagersalgskasser pr. butik og hvad der ligger i dem." />
      <Segmented
        label="Butik"
        value={store}
        onChange={setStore}
        options={[
          { value: "vejle", label: "Vejle" },
          { value: "slagelse", label: "Slagelse" },
        ]}
      />
      {storeReady && (
        <BoxBar
          store={store}
          onBoxChange={(b) => {
            setOpen(b);
            void load();
          }}
        />
      )}

      {error && <Notice tone="danger">{error}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}

      <div className="space-y-2">
        <Button variant="secondary" disabled={!canAssign || busy} onClick={() => setConfirming(true)}>
          {open ? `Læg alle lagersalgsvarer uden kasse i ${boxLabel(open.number)}` : "Læg alle lagersalgsvarer uden kasse i åben kasse"}
        </Button>
        <p className="text-[13px] text-gray">{unboxed === 0 ? "Alle lagersalgsvarer ligger i en kasse." : `${unboxed} lagersalgsvarer på lager ligger ikke i en kasse.`}</p>
        {confirming && open && (
          <div className="space-y-2">
            <Notice tone="warning" title={`Læg ${unboxed} varer i ${boxLabel(open.number).toLowerCase()}?`}>
              Hver vare lægges i kassen med hele butiksantallet.
            </Notice>
            <div className="flex gap-2">
              <Button variant="primary" loading={busy} onClick={() => void assign()}>{`Læg ${unboxed} varer i ${boxLabel(open.number).toLowerCase()}`}</Button>
              <Button variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>Fortryd</Button>
            </div>
          </div>
        )}
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} loading={loading} empty={{ title: "Ingen kasser endnu" }} />
    </div>
  );
}
